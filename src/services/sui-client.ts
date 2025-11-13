import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { config } from '../config/index.js';

/**
 * Service for interacting with Sui blockchain
 * Handles vector registry operations
 */
export class SuiClientService {
  private client: SuiClient;
  private keypair: Ed25519Keypair | null = null;

  constructor() {
    this.client = new SuiClient({ url: config.sui.rpcUrl });

    // Initialize keypair if private key is provided
    if (config.sui.privateKey) {
      try {
        // Decode the bech32-encoded private key
        const { secretKey } = decodeSuiPrivateKey(config.sui.privateKey);
        this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
      } catch (error) {
        console.warn('Failed to initialize Sui keypair:', error);
      }
    }
  }

  /**
   * Get the Sui address of the current keypair
   */
  getAddress(): string {
    if (!this.keypair) {
      throw new Error('No keypair initialized');
    }
    return this.keypair.getPublicKey().toSuiAddress();
  }

  /**
   * Create a new vector registry (shared object)
   */
  async createRegistry(): Promise<string> {
    if (!this.keypair) {
      throw new Error('No keypair initialized. Set SUI_PRIVATE_KEY in .env');
    }

    const packageId = config.sui.vectorRegistryPackageId;
    if (!packageId) {
      throw new Error('VECTOR_REGISTRY_PACKAGE_ID not set in config');
    }

    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${packageId}::vector_registry::create_registry`,
      arguments: [],
    });

    const result = await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    // Extract the created registry object ID
    const createdObjects = result.objectChanges?.filter(
      (change: any) => change.type === 'created'
    );

    if (!createdObjects || createdObjects.length === 0) {
      throw new Error('Failed to create registry');
    }

    const registryId = (createdObjects[0] as any).objectId;
    console.log(`✓ Created vector registry: ${registryId}`);

    return registryId;
  }

  /**
   * Add a document to the vector registry
   */
  async addDocument(params: {
    registryId: string;
    filename: string;
    vectorBlobId: string;
    documentBlobId: string;
    chunkCount: number;
    embeddingModel: string;
    accessPolicyId?: string;
  }): Promise<SuiTransactionBlockResponse> {
    if (!this.keypair) {
      throw new Error('No keypair initialized');
    }

    const packageId = config.sui.vectorRegistryPackageId;
    if (!packageId) {
      throw new Error('VECTOR_REGISTRY_PACKAGE_ID not set in config');
    }

    const tx = new TransactionBlock();

    // Convert strings to vector<u8>
    const filenameBytes = Array.from(Buffer.from(params.filename, 'utf-8'));
    const vectorBlobIdBytes = Array.from(Buffer.from(params.vectorBlobId, 'utf-8'));
    const documentBlobIdBytes = Array.from(Buffer.from(params.documentBlobId, 'utf-8'));
    const embeddingModelBytes = Array.from(Buffer.from(params.embeddingModel, 'utf-8'));

    tx.moveCall({
      target: `${packageId}::vector_registry::add_document`,
      arguments: [
        tx.object(params.registryId),
        tx.pure(filenameBytes),
        tx.pure(vectorBlobIdBytes),
        tx.pure(documentBlobIdBytes),
        tx.pure(params.chunkCount, 'u64'),
        tx.pure(embeddingModelBytes),
        tx.pure(params.accessPolicyId ? [params.accessPolicyId] : [], 'vector<address>'),
      ],
    });

    return await this.client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
  }

  /**
   * Get document info from the registry
   */
  async getDocumentInfo(registryId: string, filename: string): Promise<any> {
    const packageId = config.sui.vectorRegistryPackageId;
    if (!packageId) {
      throw new Error('VECTOR_REGISTRY_PACKAGE_ID not set in config');
    }

    // Use a devInspect call to query the registry
    const tx = new TransactionBlock();
    const filenameBytes = Array.from(Buffer.from(filename, 'utf-8'));

    tx.moveCall({
      target: `${packageId}::vector_registry::get_document_info`,
      arguments: [
        tx.object(registryId),
        tx.pure(filenameBytes),
      ],
    });

    const result = await this.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.keypair?.getPublicKey().toSuiAddress() || '0x0',
    });

    return result;
  }

  /**
   * Get registry stats (total docs, version, owner)
   */
  async getRegistryStats(registryId: string): Promise<{
    totalDocuments: number;
    version: number;
    owner: string;
  }> {
    const obj = await this.client.getObject({
      id: registryId,
      options: { showContent: true },
    });

    if (!obj.data) {
      throw new Error('Registry not found');
    }

    const content = (obj.data as any).content?.fields;
    if (!content) {
      throw new Error('Invalid registry object');
    }

    return {
      totalDocuments: parseInt(content.total_documents),
      version: parseInt(content.version),
      owner: content.owner,
    };
  }

  /**
   * Get all documents from registry
   * Note: This uses dynamic field iteration
   */
  async getAllDocuments(registryId: string): Promise<any[]> {
    const obj = await this.client.getObject({
      id: registryId,
      options: { showContent: true },
    });

    if (!obj.data) {
      throw new Error('Registry not found');
    }

    const content = (obj.data as any).content?.fields;
    if (!content || !content.documents) {
      return [];
    }

    // The table ID is stored in the documents field
    const tableId = content.documents.fields.id.id;

    // Get all dynamic fields of the table
    const dynamicFields = await this.client.getDynamicFields({
      parentId: tableId,
    });

    // Fetch the actual content of each dynamic field
    const documents = await Promise.all(
      dynamicFields.data.map(async (field) => {
        const fieldData = await this.client.getDynamicFieldObject({
          parentId: tableId,
          name: field.name,
        });

        if (!fieldData.data) {
          return null;
        }

        // The value is nested under fields.value.fields
        const docInfo = (fieldData.data as any).content?.fields?.value?.fields;
        if (!docInfo) {
          return null;
        }

        return {
          filename: (fieldData.data as any).content.fields.name,
          vectorBlobId: docInfo.vector_blob_id,
          documentBlobId: docInfo.document_blob_id,
          chunkCount: parseInt(docInfo.chunk_count),
          embeddingModel: docInfo.embedding_model,
          owner: docInfo.owner,
          uploadedAt: parseInt(docInfo.uploaded_at),
          accessPolicyId: docInfo.access_policy_id,
        };
      })
    );

    return documents.filter((doc) => doc !== null);
  }

  /**
   * Subscribe to vector registry events
   */
  async subscribeToEvents(
    registryId: string,
    onEvent: (event: any) => void
  ): Promise<() => void> {
    const packageId = config.sui.vectorRegistryPackageId;
    if (!packageId) {
      throw new Error('VECTOR_REGISTRY_PACKAGE_ID not set in config');
    }

    // Subscribe to DocumentAdded events
    const unsubscribe = await this.client.subscribeEvent({
      filter: {
        MoveEventModule: {
          package: packageId,
          module: 'vector_registry',
        },
      },
      onMessage: (event) => {
        // Filter events for this specific registry
        if (event.parsedJson && (event.parsedJson as any).registry_id === registryId) {
          onEvent(event);
        }
      },
    });

    return unsubscribe;
  }

  /**
   * Check if a document exists in the registry
   */
  async documentExists(registryId: string, filename: string): Promise<boolean> {
    try {
      await this.getDocumentInfo(registryId, filename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current version of the registry
   */
  async getRegistryVersion(registryId: string): Promise<number> {
    const stats = await this.getRegistryStats(registryId);
    return stats.version;
  }
}

// Singleton instance
export const suiClientService = new SuiClientService();
