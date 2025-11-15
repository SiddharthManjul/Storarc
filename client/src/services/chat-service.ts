import { ChatRegistryClient, MessageMetadata, Chat } from "./chat-registry-client";
import { WalrusClient } from "./walrus-client";
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

  constructor(registryId?: string) {
    this.chatClient = new ChatRegistryClient();
    this.walrusClient = new WalrusClient();
    this.registryId = registryId || process.env.CHAT_REGISTRY_OBJECT_ID || "";
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
    await this.chatClient.addRenewalBudget(this.registryId, amountInSui);
  }

  /**
   * Create a new chat with initial message
   */
  async createChat(
    chatId: string,
    title: string,
    initialMessage: Message
  ): Promise<void> {
    const chatData: ChatData = {
      chatId,
      title,
      messages: [initialMessage],
    };

    // Upload to Walrus
    const jsonData = JSON.stringify(chatData);
    const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // Register on Sui
    const epochs = 30; // Default for new chats
    await this.chatClient.createChat(
      this.registryId,
      chatId,
      title,
      walrusBlob.blobId, // Extract blobId string from WalrusBlob object
      epochs,
      chatData.messages.length
    );
  }

  /**
   * Add a message to existing chat
   */
  async addMessage(chatId: string, newMessage: Message): Promise<void> {
    // 1. Download current chat from Walrus
    const chat = await this.loadChat(chatId);

    // 2. Add new message
    chat.messages.push(newMessage);

    // 3. Upload updated chat to Walrus
    const jsonData = JSON.stringify(chat);
    const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // 4. Update Sui registry
    const epochs = 30; // Standard epochs for active chats
    await this.chatClient.addMessage(
      this.registryId,
      chatId,
      newMessage.id,
      newMessage.role,
      walrusBlob.blobId, // Extract blobId string
      epochs
    );
  }

  /**
   * Load chat messages from Walrus
   */
  async loadChat(chatId: string): Promise<ChatData> {
    // Get chat metadata from Sui
    const chatMeta = await this.chatClient.getChat(this.registryId, chatId);

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
    const chats = await this.chatClient.getAllChats(this.registryId);

    // Sort by last_activity (most recent first)
    chats.sort((a, b) => b.last_activity - a.last_activity);

    return chats;
  }

  /**
   * Mark chat as important/unimportant
   */
  async setChatImportance(chatId: string, isImportant: boolean): Promise<void> {
    await this.chatClient.setChatImportance(
      this.registryId,
      chatId,
      isImportant
    );
  }

  /**
   * Check and renew chat if needed (lazy renewal)
   */
  async checkAndRenewChat(chatId: string): Promise<boolean> {
    const chatMeta = await this.chatClient.getChat(this.registryId, chatId);

    if (!chatMeta) {
      return false;
    }

    // Check if needs renewal
    if (!this.chatClient.needsRenewal(chatMeta)) {
      return false;
    }

    console.log(`Chat ${chatId} needs renewal, renewing...`);

    // Download current data from Walrus
    const chatData = await this.loadChat(chatId);

    // Re-upload to Walrus
    const jsonData = JSON.stringify(chatData);
    const walrusBlob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // Get recommended epochs
    const epochs = this.chatClient.getRecommendedEpochs(chatMeta);

    // Renew on Sui
    await this.chatClient.renewChat(
      this.registryId,
      chatId,
      walrusBlob.blobId, // Extract blobId string
      epochs
    );

    console.log(`Chat ${chatId} renewed with ${epochs} epochs`);
    return true;
  }

  /**
   * Update last activity timestamp
   */
  async updateLastActivity(chatId: string): Promise<void> {
    await this.chatClient.updateLastActivity(this.registryId, chatId);
  }

  /**
   * Delete chat
   */
  async deleteChat(chatId: string): Promise<void> {
    await this.chatClient.deleteChat(this.registryId, chatId);
  }

  /**
   * Check if blob exists and is accessible
   */
  async isChatAccessible(chatId: string): Promise<boolean> {
    try {
      const chatMeta = await this.chatClient.getChat(this.registryId, chatId);

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
    const chatMeta = await this.chatClient.getChat(this.registryId, chatId);

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
    const registry = await this.chatClient.getRegistry(this.registryId);
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
    return await this.chatClient.subscribeToEvents(this.registryId, onEvent);
  }
}
