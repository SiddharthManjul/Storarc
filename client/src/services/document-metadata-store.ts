/**
 * Document Metadata Store
 * Stores user document metadata on Walrus for persistence
 * Similar to chat metadata store but for uploaded documents
 */

import { WalrusClient } from './walrus-client';
import { metadataRegistry } from './metadata-registry';

export interface DocumentMetadata {
  documentId: string; // Unique ID for document
  filename: string;
  fileType: string;
  size: number;
  pageCount?: number;
  blobId: string; // Walrus blob ID for the actual document content
  vectorsBlobId?: string; // Walrus blob ID for vector embeddings
  uploadedAt: number;
  lastAccessed: number;
  chunkCount: number;
  owner: string; // User address
}

export interface UserDocumentIndex {
  userAddr: string;
  documents: DocumentMetadata[];
  lastUpdated: number;
}

export class DocumentMetadataStore {
  private walrusClient: WalrusClient;
  private cacheKey = 'document_metadata_cache';
  private isServer: boolean;

  constructor() {
    this.walrusClient = new WalrusClient();
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Get user's document index blob ID with multi-layer fallback
   * Server: Metadata registry (Sui blockchain fallback)
   * Client: localStorage only (for fast access)
   */
  private async getUserIndexBlobId(userAddr: string): Promise<string | null> {
    try {
      if (this.isServer) {
        // Server-side: use metadata registry with Sui fallback
        // Use a different key to avoid collision with chat metadata
        return await metadataRegistry.getMetadataBlobId(`${userAddr}_docs`);
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
   * Store user's document index blob ID in persistent storage
   * Server: Sui blockchain + cache
   * Client: localStorage
   */
  private async setUserIndexBlobId(userAddr: string, blobId: string): Promise<void> {
    try {
      if (this.isServer) {
        // Server-side: store on Sui blockchain (survives restarts)
        await metadataRegistry.setMetadataBlobId(`${userAddr}_docs`, blobId);
      } else {
        // Client-side: use localStorage
        localStorage.setItem(`${this.cacheKey}_${userAddr}`, JSON.stringify({ blobId }));
      }
    } catch (error) {
      console.error('Failed to cache document index blob ID:', error);
    }
  }

  /**
   * Load user's document index from Walrus
   */
  async loadUserIndex(userAddr: string): Promise<UserDocumentIndex> {
    const blobId = await this.getUserIndexBlobId(userAddr);

    if (!blobId) {
      // No index exists yet, return empty
      return {
        userAddr,
        documents: [],
        lastUpdated: Date.now(),
      };
    }

    try {
      const data = await this.walrusClient.getBlobAsString(blobId);
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load user document index from Walrus:', error);
      // Return empty index if loading fails
      return {
        userAddr,
        documents: [],
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Save user's document index to Walrus
   */
  async saveUserIndex(index: UserDocumentIndex): Promise<string> {
    index.lastUpdated = Date.now();

    const jsonData = JSON.stringify(index);
    const blob = await this.walrusClient.uploadBlob(Buffer.from(jsonData));

    // Cache the blob ID (stores on Sui if server-side)
    await this.setUserIndexBlobId(index.userAddr, blob.blobId);

    return blob.blobId;
  }

  /**
   * Add document to user's index
   */
  async addDocumentToIndex(
    userAddr: string,
    documentMetadata: DocumentMetadata
  ): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    // Remove existing document with same ID (update)
    index.documents = index.documents.filter(d => d.documentId !== documentMetadata.documentId);

    // Add new document at the beginning
    index.documents.unshift(documentMetadata);

    // Save updated index
    await this.saveUserIndex(index);
  }

  /**
   * Update document metadata in user's index
   */
  async updateDocumentInIndex(
    userAddr: string,
    documentId: string,
    updates: Partial<DocumentMetadata>
  ): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    // Find and update document
    const docIndex = index.documents.findIndex(d => d.documentId === documentId);

    if (docIndex !== -1) {
      index.documents[docIndex] = {
        ...index.documents[docIndex],
        ...updates,
        lastAccessed: Date.now(),
      };

      // Save updated index
      await this.saveUserIndex(index);
    }
  }

  /**
   * Get specific document metadata
   */
  async getDocumentMetadata(
    userAddr: string,
    documentId: string
  ): Promise<DocumentMetadata | null> {
    const index = await this.loadUserIndex(userAddr);
    return index.documents.find(d => d.documentId === documentId) || null;
  }

  /**
   * Get all documents for user
   */
  async getAllDocuments(userAddr: string): Promise<DocumentMetadata[]> {
    const index = await this.loadUserIndex(userAddr);
    return index.documents.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  /**
   * Delete document from user's index
   */
  async deleteDocumentFromIndex(userAddr: string, documentId: string): Promise<void> {
    const index = await this.loadUserIndex(userAddr);

    index.documents = index.documents.filter(d => d.documentId !== documentId);

    await this.saveUserIndex(index);
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
export const documentMetadataStore = new DocumentMetadataStore();
