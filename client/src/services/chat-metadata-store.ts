/**
 * Chat Metadata Store
 * Stores chat metadata on Walrus for easy retrieval
 * Solves the dynamic field query issue with Sui Tables
 */

import { WalrusClient } from './walrus-client';
import { metadataRegistry } from './metadata-registry';

export interface ChatMetadata {
  chatId: string;
  title: string;
  created_at: number;
  last_activity: number;
  last_renewal: number; // When blob was last renewed
  message_count: number;
  messages_blob_id: string;
  blob_expires_at: number; // Expiration timestamp
  current_epochs: number; // Current epoch duration
  is_important: boolean;
  owner: string;
}

export interface UserChatIndex {
  userAddr: string;
  chats: ChatMetadata[];
  lastUpdated: number;
}

export class ChatMetadataStore {
  private walrusClient: WalrusClient;
  private cacheKey = 'chat_metadata_cache';
  private isServer: boolean;

  constructor() {
    this.walrusClient = new WalrusClient();
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Get user's chat index blob ID with multi-layer fallback
   * Server: Cache → Sui blockchain → null
   * Client: localStorage only (for fast access)
   */
  private async getUserIndexBlobId(userAddr: string): Promise<string | null> {
    try {
      if (this.isServer) {
        // Server-side: use metadata registry with Sui fallback
        return await metadataRegistry.getMetadataBlobId(userAddr);
      } else {
        // Client-side: use localStorage only
        const stored = localStorage.getItem(`${this.cacheKey}_${userAddr}`);
        return stored ? JSON.parse(stored).blobId : null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Store user's chat index blob ID in persistent storage
   * Server: Sui blockchain + cache
   * Client: localStorage
   */
  private async setUserIndexBlobId(userAddr: string, blobId: string): Promise<void> {
    try {
      if (this.isServer) {
        // Server-side: store on Sui blockchain (survives restarts)
        await metadataRegistry.setMetadataBlobId(userAddr, blobId);
      } else {
        // Client-side: use localStorage
        localStorage.setItem(`${this.cacheKey}_${userAddr}`, JSON.stringify({ blobId }));
      }
    } catch (error) {
      console.error('Failed to cache index blob ID:', error);
    }
  }

  /**
   * Load user's chat index from Walrus
   */
  async loadUserIndex(userAddr: string): Promise<UserChatIndex> {
    const blobId = await this.getUserIndexBlobId(userAddr);

    if (!blobId) {
      // No index exists yet, return empty
      return {
        userAddr,
        chats: [],
        lastUpdated: Date.now(),
      };
    }

    try {
      const data = await this.walrusClient.getBlobAsString(blobId);
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load user index from Walrus:', error);
      // Return empty index if loading fails
      return {
        userAddr,
        chats: [],
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Save user's chat index to Walrus
   */
  async saveUserIndex(index: UserChatIndex): Promise<string> {
    index.lastUpdated = Date.now();

    const jsonData = JSON.stringify(index);
    const blob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // Cache the blob ID (stores on Sui if server-side)
    await this.setUserIndexBlobId(index.userAddr, blob.blobId);

    return blob.blobId;
  }

  /**
   * Add chat to user's index
   */
  async addChatToIndex(
    userAddr: string,
    chatMetadata: ChatMetadata
  ): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    // Remove existing chat with same ID (update)
    index.chats = index.chats.filter(c => c.chatId !== chatMetadata.chatId);

    // Add new chat at the beginning
    index.chats.unshift(chatMetadata);

    // Save updated index
    await this.saveUserIndex(index);
  }

  /**
   * Update chat metadata in user's index
   */
  async updateChatInIndex(
    userAddr: string,
    chatId: string,
    updates: Partial<ChatMetadata>
  ): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    // Find and update chat
    const chatIndex = index.chats.findIndex(c => c.chatId === chatId);

    if (chatIndex !== -1) {
      index.chats[chatIndex] = {
        ...index.chats[chatIndex],
        ...updates,
        last_activity: Date.now(),
      };

      // Save updated index
      await this.saveUserIndex(index);
    }
  }

  /**
   * Get specific chat metadata
   */
  async getChatMetadata(
    userAddr: string,
    chatId: string
  ): Promise<ChatMetadata | null> {
    const index = await this.loadUserIndex(userAddr);
    return index.chats.find(c => c.chatId === chatId) || null;
  }

  /**
   * Get all chats for user
   */
  async getAllChats(userAddr: string): Promise<ChatMetadata[]> {
    const index = await this.loadUserIndex(userAddr);
    return index.chats.sort((a, b) => b.last_activity - a.last_activity);
  }

  /**
   * Delete chat from user's index
   */
  async deleteChatFromIndex(userAddr: string, chatId: string): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    index.chats = index.chats.filter(c => c.chatId !== chatId);

    await this.saveUserIndex(index);
  }

  /**
   * Update chat importance
   */
  async setChatImportance(
    userAddr: string,
    chatId: string,
    isImportant: boolean
  ): Promise<void> {
    await this.updateChatInIndex(userAddr, chatId, { is_important: isImportant });
  }

  /**
   * Clear cache (for development/testing)
   */
  clearCache(): void {
    if (this.isServer) {
      // Server-side: clear metadata registry cache
      metadataRegistry.clearCache();
    } else {
      // Client-side: clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.cacheKey)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

// Export singleton
export const chatMetadataStore = new ChatMetadataStore();
