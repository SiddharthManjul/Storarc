import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { config } from "../config";

export interface MessageMetadata {
  id: string;
  role: "user" | "assistant";
}

export interface Chat {
  id: string;
  title: string;
  created_at: number;
  last_activity: number;
  message_count: number;
  messages_blob_id: string;
  blob_uploaded_at: number;
  blob_expiry_timestamp: number;
  blob_epochs: number;
  is_important: boolean;
  owner: string;
  messages: MessageMetadata[];
}

export interface ChatRegistry {
  id: string;
  total_chats: number;
  owner: string;
  renewal_budget: number;
  created_at: number;
}

export class ChatRegistryClient {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private packageId: string;

  constructor() {
    this.client = new SuiClient({ url: config.sui.rpcUrl });

    // Parse Sui private key (supports both bech32 'suiprivkey1...' and hex formats)
    const privateKey = config.sui.privateKey;

    if (privateKey.startsWith('suiprivkey')) {
      // Bech32 format - use decodeSuiPrivateKey from SDK
      this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
    } else {
      // Assume hex or base64 format
      const privateKeyBytes = privateKey.startsWith('0x')
        ? Buffer.from(privateKey.slice(2), 'hex')
        : Buffer.from(privateKey, 'base64');
      this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    }

    this.packageId = config.sui.chatRegistryPackageId;
  }

  /**
   * Create a new chat registry for the user
   */
  async createRegistry(): Promise<string> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::create_registry`,
    });

    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    // Extract created registry object ID
    const createdObjects = result.objectChanges?.filter(
      (obj) => obj.type === "created"
    );

    if (createdObjects && createdObjects.length > 0) {
      return (createdObjects[0] as any).objectId;
    }

    throw new Error("Failed to create chat registry");
  }

  /**
   * Add funds to renewal budget
   */
  async addRenewalBudget(
    registryId: string,
    amountInSui: number
  ): Promise<void> {
    const tx = new Transaction();

    const amountInMist = Math.floor(amountInSui * 1_000_000_000);
    const [coin] = tx.splitCoins(tx.gas, [amountInMist]);

    tx.moveCall({
      target: `${this.packageId}::chat_registry::add_renewal_budget`,
      arguments: [tx.object(registryId), coin],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Create a new chat
   */
  async createChat(
    registryId: string,
    chatId: string,
    title: string,
    messagesBlobId: string,
    blobEpochs: number,
    messageCount: number
  ): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::create_chat`,
      arguments: [
        tx.object(registryId),
        tx.pure.string(chatId),
        tx.pure.string(title),
        tx.pure.string(messagesBlobId),
        tx.pure.u64(blobEpochs),
        tx.pure.u64(messageCount),
      ],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Add a message to existing chat
   */
  async addMessage(
    registryId: string,
    chatId: string,
    messageId: string,
    role: string,
    newBlobId: string,
    blobEpochs: number
  ): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::add_message`,
      arguments: [
        tx.object(registryId),
        tx.pure.string(chatId),
        tx.pure.string(messageId),
        tx.pure.string(role),
        tx.pure.string(newBlobId),
        tx.pure.u64(blobEpochs),
      ],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Mark/unmark chat as important
   */
  async setChatImportance(
    registryId: string,
    chatId: string,
    isImportant: boolean
  ): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::set_chat_importance`,
      arguments: [
        tx.object(registryId),
        tx.pure.string(chatId),
        tx.pure.bool(isImportant),
      ],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Renew chat storage (re-upload to Walrus)
   */
  async renewChat(
    registryId: string,
    chatId: string,
    newBlobId: string,
    blobEpochs: number
  ): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::renew_chat`,
      arguments: [
        tx.object(registryId),
        tx.pure.string(chatId),
        tx.pure.string(newBlobId),
        tx.pure.u64(blobEpochs),
      ],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Update chat's last activity timestamp
   */
  async updateLastActivity(
    registryId: string,
    chatId: string
  ): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::update_last_activity`,
      arguments: [tx.object(registryId), tx.pure.string(chatId)],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Delete chat from registry
   */
  async deleteChat(registryId: string, chatId: string): Promise<void> {
    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::chat_registry::delete_chat`,
      arguments: [tx.object(registryId), tx.pure.string(chatId)],
    });

    await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
    });
  }

  /**
   * Get chat registry object
   */
  async getRegistry(registryId: string): Promise<ChatRegistry | null> {
    try {
      const object = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!object.data || !object.data.content) {
        return null;
      }

      const content = object.data.content as any;
      const fields = content.fields;

      return {
        id: registryId,
        total_chats: parseInt(fields.total_chats),
        owner: fields.owner,
        renewal_budget: parseInt(fields.renewal_budget),
        created_at: parseInt(fields.created_at),
      };
    } catch (error) {
      console.error("Error fetching registry:", error);
      return null;
    }
  }

  /**
   * Get a specific chat by ID
   */
  async getChat(registryId: string, chatId: string): Promise<Chat | null> {
    try {
      const object = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!object.data || !object.data.content) {
        return null;
      }

      const content = object.data.content as any;
      const chats = content.fields.chats.fields;

      // Search for chat in the table
      // Note: This is simplified - in production, use dynamic fields API
      // For now, we'll fetch via events or use a different approach

      return null;
    } catch (error) {
      console.error("Error fetching chat:", error);
      return null;
    }
  }

  /**
   * Get all chats for a registry (via events)
   */
  async getAllChats(registryId: string): Promise<Chat[]> {
    try {
      // Query ChatCreated events
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::chat_registry::ChatCreated`,
        },
        limit: 1000,
      });

      const chats: Chat[] = [];

      for (const event of events.data) {
        const eventData = event.parsedJson as any;

        if (eventData.registry_id === registryId) {
          // Fetch full chat details
          // Note: In production, implement proper dynamic field queries
          chats.push({
            id: eventData.chat_id,
            title: "", // Fetch from object
            created_at: eventData.timestamp,
            last_activity: eventData.timestamp,
            message_count: 0,
            messages_blob_id: "",
            blob_uploaded_at: 0,
            blob_expiry_timestamp: 0,
            blob_epochs: 0,
            is_important: false,
            owner: eventData.owner,
            messages: [],
          });
        }
      }

      return chats;
    } catch (error) {
      console.error("Error fetching chats:", error);
      return [];
    }
  }

  /**
   * Check if chat needs renewal
   */
  needsRenewal(chat: Chat): boolean {
    const now = Date.now();
    const timeUntilExpiry = chat.blob_expiry_timestamp - now;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return timeUntilExpiry < sevenDaysMs && timeUntilExpiry > 0;
  }

  /**
   * Get recommended epochs for chat renewal
   */
  getRecommendedEpochs(chat: Chat): number {
    const now = Date.now();
    const IMPORTANT_EPOCHS = 53;
    const ACTIVE_EPOCHS = 30;
    const INACTIVE_EPOCHS = 30;

    if (chat.is_important) {
      return IMPORTANT_EPOCHS;
    }

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceActivity = now - chat.last_activity;

    return timeSinceActivity < thirtyDaysMs ? ACTIVE_EPOCHS : INACTIVE_EPOCHS;
  }

  /**
   * Subscribe to chat events
   */
  async subscribeToEvents(
    registryId: string,
    onEvent: (event: any) => void
  ): Promise<() => void> {
    const unsubscribe = await this.client.subscribeEvent({
      filter: {
        MoveEventModule: {
          package: this.packageId,
          module: "chat_registry",
        },
      },
      onMessage: (event) => {
        const eventData = event.parsedJson as any;
        if (eventData.registry_id === registryId) {
          onEvent(event);
        }
      },
    });

    return unsubscribe;
  }
}
