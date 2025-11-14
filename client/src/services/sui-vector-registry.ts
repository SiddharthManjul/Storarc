/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { suiClientService } from '@/services/sui-client';
import { walrusClient } from '@/services/walrus-client';
import {
  serializeVectors,
  deserializeVectors,
  convertMemoryVectorsToSerializable,
  SerializedVector,
  SerializedVectorStore,
} from '@/utils/vector-serialization';
import { config } from '@/config';

export interface DocumentVectorMetadata {
  filename: string;
  vectorBlobId: string;
  documentBlobId: string;
  chunkCount: number;
  embeddingModel: string;
  owner: string;
  uploadedAt: number;
  accessPolicyId?: string;
}

/**
 * Service for managing document vectors with Sui registry + Walrus storage
 * Implements the hybrid architecture: Sui (metadata) + Walrus (vectors/docs) + Local (cache)
 */
export class SuiVectorRegistryService {
  private registryId: string;

  constructor() {
    this.registryId = config.sui.vectorRegistryObjectId;
  }

  /**
   * Add a document's vectors to the registry
   *
   * Flow:
   * 1. Serialize vectors
   * 2. Upload vectors to Walrus → vectorBlobId
   * 3. Upload full document to Walrus → documentBlobId (if not already done)
   * 4. Register metadata in Sui registry
   *
   * @param vectors - Document vectors (from MemoryVectorStore)
   * @param metadata - Document metadata
   */
  async addDocument(params: {
    filename: string;
    vectors: any[]; // MemoryVectorStore format
    documentBlobId: string; // Already uploaded to Walrus
    embeddingModel?: string;
    accessPolicyId?: string;
  }): Promise<{
    vectorBlobId: string;
    transactionDigest: string;
  }> {
    console.log(`\n📊 Registering vectors for: ${params.filename}`);

    // Step 1: Serialize vectors for Walrus storage
    console.log('   Serializing vectors...');
    const serializedVectors = convertMemoryVectorsToSerializable(params.vectors);
    const vectorData = serializeVectors(serializedVectors, {
      embeddingModel: params.embeddingModel || config.openai.embeddingModel,
      dimensions: config.vectorStore.dimensions,
    });

    // Step 2: Upload vectors to Walrus
    console.log(`   Uploading ${params.vectors.length} vectors to Walrus...`);
    const vectorBlob = await walrusClient.uploadBlob(vectorData);
    console.log(`   ✓ Vectors uploaded: ${vectorBlob.blobId}`);

    // Step 3: Register or update in Sui
    console.log('   Registering in Sui vector registry...');

    // Check if document already exists
    const exists = await suiClientService.documentExists(this.registryId, params.filename);

    let result;
    if (exists) {
      console.log('   ℹ️  Document exists, updating...');
      result = await suiClientService.updateDocument({
        registryId: this.registryId,
        filename: params.filename,
        vectorBlobId: vectorBlob.blobId,
        chunkCount: params.vectors.length,
      });
      console.log(`   ✓ Updated in Sui: ${result.digest}`);
    } else {
      console.log('   ℹ️  New document, adding...');
      result = await suiClientService.addDocument({
        registryId: this.registryId,
        filename: params.filename,
        vectorBlobId: vectorBlob.blobId,
        documentBlobId: params.documentBlobId,
        chunkCount: params.vectors.length,
        embeddingModel: params.embeddingModel || config.openai.embeddingModel,
        accessPolicyId: params.accessPolicyId,
      });
      console.log(`   ✓ Registered in Sui: ${result.digest}`);
    }

    return {
      vectorBlobId: vectorBlob.blobId,
      transactionDigest: result.digest,
    };
  }

  /**
   * Get document metadata from Sui registry
   */
  async getDocumentMetadata(filename: string): Promise<DocumentVectorMetadata | null> {
    try {
      await suiClientService.getDocumentInfo(this.registryId, filename);
      // TODO: Parse the result (implementation depends on Sui response format)
      // For now, return null if not found
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Download vectors from Walrus
   */
  async downloadVectors(vectorBlobId: string): Promise<SerializedVector[]> {
    console.log(`   Downloading vectors from Walrus: ${vectorBlobId}...`);
    const data = await walrusClient.getBlobAsString(vectorBlobId);
    const vectorStore = deserializeVectors(data);
    console.log(`   ✓ Downloaded ${vectorStore.vectors.length} vectors`);
    return vectorStore.vectors;
  }

  /**
   * Get all documents in the registry
   */
  async getAllDocuments(): Promise<any[]> {
    return await suiClientService.getAllDocuments(this.registryId);
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalDocuments: number;
    version: number;
    owner: string;
  }> {
    return await suiClientService.getRegistryStats(this.registryId);
  }

  /**
   * Check if registry is configured
   */
  isConfigured(): boolean {
    return !!this.registryId && this.registryId.length > 0;
  }

  /**
   * Subscribe to registry events (for real-time sync)
   */
  async subscribeToUpdates(
    onDocumentAdded: (event: any) => void
  ): Promise<() => void> {
    console.log('📡 Subscribing to vector registry events...');

    return await suiClientService.subscribeToEvents(this.registryId, (event) => {
      const eventType = event.type.split('::').pop();

      switch (eventType) {
        case 'DocumentAdded':
          console.log(`✓ New document added: ${event.parsedJson.filename}`);
          onDocumentAdded(event.parsedJson);
          break;
        case 'DocumentUpdated':
          console.log(`✓ Document updated: ${event.parsedJson.filename}`);
          break;
        case 'RegistryVersionUpdated':
          console.log(`✓ Registry version updated: ${event.parsedJson.new_version}`);
          break;
      }
    });
  }

  /**
   * Get current registry version (for cache invalidation)
   */
  async getVersion(): Promise<number> {
    return await suiClientService.getRegistryVersion(this.registryId);
  }
}

// Singleton instance
export const suiVectorRegistry = new SuiVectorRegistryService();
