import { ChatRegistryClient, MessageMetadata, Chat } from "./chat-registry-client";
import { WalrusClient } from "./walrus-client";
import { chatMetadataStore, ChatMetadata } from "./chat-metadata-store";
import crypto from "crypto";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Array<{
    filename: string;
    blobId: string;
    relevance: number;
    preview: string;
  }>;
}

export interface ChatData {
  chatId: string;
  title: string;
  messages: Message[];
}

export class ChatService {
  private chatClient: ChatRegistryClient;
  private walrusClient: WalrusClient;
  private registryId: string;
  private userAddress: string | null;

  constructor(registryId?: string, userAddress?: string) {
    this.chatClient = new ChatRegistryClient();
    this.walrusClient = new WalrusClient();
    this.registryId = registryId || process.env.CHAT_REGISTRY_OBJECT_ID || "";
    this.userAddress = userAddress || null;
  }

  /**
   * Set registry ID for user-specific operations
   */
  setRegistryId(registryId: string): void {
    this.registryId = registryId;
  }

  /**
   * Set user address for user-specific operations
   */
  setUserAddress(userAddress: string): void {
    this.userAddress = userAddress;
  }

  /**
   * Get registry ID
   */
  getRegistryId(): string {
    if (!this.registryId) {
      throw new Error("Registry ID not set. Please authenticate first.");
    }
    return this.registryId;
  }

  /**
   * Create a new chat registry
   */
  async createRegistry(): Promise<string> {
    return await this.chatClient.createRegistry();
  }

  /**
   * Add funds to renewal budget
   */
  async addRenewalBudget(amountInSui: number): Promise<void> {
    await this.chatClient.addRenewalBudget(this.getRegistryId(), amountInSui);
  }

  /**
   * Create a new chat with initial message
   */
  async createChat(
    chatId: string,
    title: string,
    initialMessage: Message
  ): Promise<void> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    const chatData: ChatData = {
      chatId,
      title,
      messages: [initialMessage],
    };

    // Upload to Walrus
    const jsonData = JSON.stringify(chatData);
    const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // Store metadata in Walrus-based index
    const now = Date.now();
    const epochs = 30; // Initial epochs (testnet)
    const metadata: ChatMetadata = {
      chatId,
      title,
      created_at: now,
      last_activity: now,
      last_renewal: now,
      message_count: 1,
      messages_blob_id: walrusBlob.blobId,
      blob_expires_at: now + (epochs * 24 * 60 * 60 * 1000), // 30 days
      current_epochs: epochs,
      is_important: false,
      owner: this.userAddress,
    };

    await chatMetadataStore.addChatToIndex(this.userAddress, metadata);

    // Also register on Sui (optional for MVP, can be removed if causing issues)
    try {
      const epochs = 30; // Default for new chats
      await this.chatClient.createChat(
        this.getRegistryId(),
        chatId,
        title,
        walrusBlob.blobId,
        epochs,
        chatData.messages.length
      );
    } catch (error) {
      console.warn('Sui registration failed (non-critical):', error);
      // Continue anyway - metadata is in Walrus
    }
  }

  /**
   * Add a message to existing chat
   */
  async addMessage(chatId: string, newMessage: Message): Promise<void> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // 1. Download current chat from Walrus
    const chat = await this.loadChat(chatId);

    // 2. Add new message
    chat.messages.push(newMessage);

    // 3. Upload updated chat to Walrus
    const jsonData = JSON.stringify(chat);
    const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // 4. Update metadata in Walrus index
    await chatMetadataStore.updateChatInIndex(this.userAddress, chatId, {
      messages_blob_id: walrusBlob.blobId,
      message_count: chat.messages.length,
      last_activity: Date.now(),
    });

    // 5. Update Sui registry (optional)
    try {
      const epochs = 30; // Standard epochs for active chats
      await this.chatClient.addMessage(
        this.getRegistryId(),
        chatId,
        newMessage.id,
        newMessage.role,
        walrusBlob.blobId,
        epochs
      );
    } catch (error) {
      console.warn('Sui update failed (non-critical):', error);
      // Continue anyway - metadata is updated in Walrus
    }
  }

  /**
   * Load chat messages from Walrus
   */
  async loadChat(chatId: string): Promise<ChatData> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Get chat metadata from Walrus index
    const chatMeta = await chatMetadataStore.getChatMetadata(this.userAddress, chatId);

    if (!chatMeta) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    // Download from Walrus
    const blobData = await this.walrusClient.getBlobAsString(
      chatMeta.messages_blob_id
    );
    const chatData: ChatData = JSON.parse(blobData);

    return chatData;
  }

  /**
   * Get all chats for user
   */
  async getAllChats(): Promise<Chat[]> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Get chats from Walrus metadata store
    const chatMetadataList = await chatMetadataStore.getAllChats(this.userAddress);

    // Convert to Chat format with proper expiry info
    const chats: Chat[] = chatMetadataList.map(meta => ({
      id: meta.chatId,
      title: meta.title,
      created_at: meta.created_at,
      last_activity: meta.last_activity,
      message_count: meta.message_count,
      messages_blob_id: meta.messages_blob_id,
      blob_uploaded_at: meta.last_renewal,
      blob_expiry_timestamp: meta.blob_expires_at,
      blob_epochs: meta.current_epochs,
      is_important: meta.is_important,
      owner: meta.owner,
      messages: [], // Messages loaded separately
    }));

    return chats;
  }

  /**
   * Mark chat as important/unimportant
   */
  async setChatImportance(chatId: string, isImportant: boolean): Promise<void> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Update in Walrus metadata store
    await chatMetadataStore.setChatImportance(this.userAddress, chatId, isImportant);

    // Also update Sui registry (optional)
    try {
      await this.chatClient.setChatImportance(
        this.getRegistryId(),
        chatId,
        isImportant
      );
    } catch (error) {
      console.warn('Sui importance update failed (non-critical):', error);
    }
  }

  /**
   * Check if chat needs renewal based on hybrid policy
   */
  private needsRenewal(chatMeta: ChatMetadata): boolean {
    const now = Date.now();
    const timeUntilExpiry = chatMeta.blob_expires_at - now;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Renew if less than 7 days until expiry
    return timeUntilExpiry < sevenDaysMs && timeUntilExpiry > 0;
  }

  /**
   * Determine epochs for renewal based on chat importance and activity
   */
  private getRecommendedEpochs(chatMeta: ChatMetadata): number {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceActivity = now - chatMeta.last_activity;

    // Important chats: renew for long duration (365 days / ~365 epochs)
    if (chatMeta.is_important) {
      return 365; // ~1 year
    }

    // Active chats (activity in last 30 days): renew for 30 epochs
    if (timeSinceActivity < thirtyDaysMs) {
      return 30;
    }

    // Inactive chats: do NOT renew (will expire)
    return 0;
  }

  /**
   * Check and renew chat if needed (lazy renewal on access)
   */
  async checkAndRenewChat(chatId: string): Promise<boolean> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Get chat metadata from Walrus index
    const chatMeta = await chatMetadataStore.getChatMetadata(this.userAddress, chatId);

    if (!chatMeta) {
      return false;
    }

    // Check if needs renewal
    if (!this.needsRenewal(chatMeta)) {
      return false;
    }

    console.log(`Chat ${chatId} needs renewal, checking policy...`);

    // Get recommended epochs based on policy
    const epochs = this.getRecommendedEpochs(chatMeta);

    // If 0 epochs, chat is inactive and should not be renewed
    if (epochs === 0) {
      console.log(`Chat ${chatId} is inactive, will not renew (will expire)`);
      return false;
    }

    console.log(`Chat ${chatId} renewing for ${epochs} epochs...`);

    try {
      // Download current data from Walrus
      const chatData = await this.loadChat(chatId);

      // Re-upload to Walrus with new epochs
      const jsonData = JSON.stringify(chatData);
      const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

      // Update metadata in Walrus index
      const now = Date.now();
      await chatMetadataStore.updateChatInIndex(this.userAddress, chatId, {
        messages_blob_id: walrusBlob.blobId,
        last_renewal: now,
        blob_expires_at: now + (epochs * 24 * 60 * 60 * 1000),
        current_epochs: epochs,
      });

      // Update Sui registry (optional)
      try {
        await this.chatClient.renewChat(
          this.getRegistryId(),
          chatId,
          walrusBlob.blobId,
          epochs
        );
      } catch (error) {
        console.warn('Sui renewal failed (non-critical):', error);
      }

      console.log(`Chat ${chatId} renewed successfully with ${epochs} epochs`);
      return true;
    } catch (error) {
      console.error(`Failed to renew chat ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Update last activity timestamp in metadata
   */
  async updateChatActivity(chatId: string): Promise<void> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Update in Walrus metadata store
    await chatMetadataStore.updateChatInIndex(this.userAddress, chatId, {
      last_activity: Date.now(),
    });

    // Also update Sui registry (optional)
    try {
      await this.chatClient.updateLastActivity(this.getRegistryId(), chatId);
    } catch (error) {
      console.warn('Sui activity update failed (non-critical):', error);
    }
  }

  /**
   * @deprecated Use updateChatActivity instead
   */
  async updateLastActivity(chatId: string): Promise<void> {
    return this.updateChatActivity(chatId);
  }

  /**
   * Delete chat
   */
  async deleteChat(chatId: string): Promise<void> {
    if (!this.userAddress) {
      throw new Error("User address is required for chat operations");
    }

    // Delete from Walrus metadata store (primary storage)
    await chatMetadataStore.deleteChatFromIndex(this.userAddress, chatId);

    // Note: We don't delete from Sui registry because chats are stored in Walrus,
    // not in the Sui chat_registry Table. The Sui registry is legacy/optional.
    // Attempting to delete would fail with E_CHAT_NOT_FOUND (error code 2).
  }

  /**
   * Check if blob exists and is accessible
   */
  async isChatAccessible(chatId: string): Promise<boolean> {
    try {
      const chatMeta = await this.chatClient.getChat(this.getRegistryId(), chatId);

      if (!chatMeta) {
        return false;
      }

      // Check if blob expired
      if (Date.now() > chatMeta.blob_expiry_timestamp) {
        return false;
      }

      // Try to access blob
      const exists = await this.walrusClient.blobExists(
        chatMeta.messages_blob_id
      );

      return exists;
    } catch (error) {
      console.error("Error checking chat accessibility:", error);
      return false;
    }
  }

  /**
   * Get chat expiry info
   */
  async getChatExpiryInfo(chatId: string): Promise<{
    expiresAt: number;
    daysRemaining: number;
    needsRenewal: boolean;
  } | null> {
    const chatMeta = await this.chatClient.getChat(this.getRegistryId(), chatId);

    if (!chatMeta) {
      return null;
    }

    const now = Date.now();
    const timeRemaining = chatMeta.blob_expiry_timestamp - now;
    const daysRemaining = Math.max(0, Math.floor(timeRemaining / (24 * 60 * 60 * 1000)));

    return {
      expiresAt: chatMeta.blob_expiry_timestamp,
      daysRemaining,
      needsRenewal: this.chatClient.needsRenewal(chatMeta),
    };
  }

  /**
   * Get renewal budget balance
   */
  async getRenewalBudget(): Promise<number> {
    const registry = await this.chatClient.getRegistry(this.getRegistryId());
    return registry ? registry.renewal_budget : 0;
  }

  /**
   * Hash message content for verification
   */
  private hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Subscribe to chat events
   */
  async subscribeToEvents(onEvent: (event: any) => void): Promise<() => void> {
    return await this.chatClient.subscribeToEvents(this.getRegistryId(), onEvent);
  }
}
