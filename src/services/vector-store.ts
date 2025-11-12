import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { config } from '../config/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VectorStoreService {
  private store: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private storePath: string;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.embeddingModel,
    });
    this.storePath = config.vectorDb.path;
  }

  /**
   * Initialize or load existing vector store
   */
  async initialize(): Promise<void> {
    try {
      // Try to load existing store
      const storeExists = await this.storeExists();

      if (storeExists) {
        console.log('Loading existing vector store...');
        await this.loadFromDisk();
        console.log('✓ Vector store loaded');
      } else {
        console.log('Creating new vector store...');
        // Create empty memory vector store
        this.store = new MemoryVectorStore(this.embeddings);

        // Ensure directory exists and save empty store
        await fs.mkdir(path.dirname(this.storePath), { recursive: true });
        await this.save();
        console.log('✓ New vector store created');
      }
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    console.log(`Adding ${documents.length} documents to vector store...`);
    await this.store.addDocuments(documents);
    await this.save();
    console.log('✓ Documents added successfully');
  }

  /**
   * Search for similar documents
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<Array<{ document: Document; score: number }>> {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    const results = await this.store.similaritySearchWithScore(query, k, filter);

    return results.map(([document, score]) => ({
      document,
      score,
    }));
  }

  /**
   * Get document count in the store
   */
  async getDocumentCount(): Promise<number> {
    if (!this.store) {
      return 0;
    }

    // MemoryVectorStore stores vectors in memoryVectors array
    return this.store.memoryVectors.length;
  }

  /**
   * Save the vector store to disk
   */
  async save(): Promise<void> {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });

    // Serialize the memory store to JSON
    const storageFile = path.join(this.storePath, 'memory-store.json');
    const data = {
      memoryVectors: this.store.memoryVectors,
    };

    await fs.writeFile(storageFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load the vector store from disk
   */
  private async loadFromDisk(): Promise<void> {
    const storageFile = path.join(this.storePath, 'memory-store.json');
    const content = await fs.readFile(storageFile, 'utf-8');
    const data = JSON.parse(content);

    // Create new store and restore vectors
    this.store = new MemoryVectorStore(this.embeddings);
    this.store.memoryVectors = data.memoryVectors || [];
  }

  /**
   * Check if store exists on disk
   */
  private async storeExists(): Promise<boolean> {
    try {
      await fs.access(path.join(this.storePath, 'memory-store.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete the vector store
   */
  async delete(): Promise<void> {
    try {
      await fs.rm(this.storePath, { recursive: true, force: true });
      this.store = null;
      console.log('✓ Vector store deleted');
    } catch (error) {
      console.error('Failed to delete vector store:', error);
    }
  }

  /**
   * Get store instance (for advanced usage)
   */
  getStore(): MemoryVectorStore {
    if (!this.store) {
      throw new Error('Vector store not initialized');
    }
    return this.store;
  }
}

// Singleton instance
export const vectorStoreService = new VectorStoreService();
