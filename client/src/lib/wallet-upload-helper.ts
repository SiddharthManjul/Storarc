/**
 * Document Upload Helper with Wallet Integration
 * Uses Sui wallet for transaction signing
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';

// Constants
const DOCUMENT_REGISTRY_PACKAGE_ID = process.env.NEXT_PUBLIC_DOCUMENT_REGISTRY_PACKAGE_ID ||
  process.env.DOCUMENT_REGISTRY_PACKAGE_ID ||
  '0xcd6c26bba8af6837ed38d40e761adb8f795ba65f1a15f735c8eb0cc35b2b1b40';

export interface UploadProgress {
  stage: 'uploading' | 'building_tx' | 'signing' | 'confirming' | 'complete';
  message: string;
  progress?: number;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  transactionDigest?: string;
  error?: string;
  details?: string;
}

export interface DocumentUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onNeedsRegistry?: () => Promise<boolean>;
}

/**
 * Calculate SHA-256 hash of file
 */
async function calculateFileHash(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Check if user has a document registry
 */
async function getUserRegistry(
  suiClient: SuiClient,
  userAddr: string
): Promise<string | null> {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: userAddr,
      filter: {
        StructType: `${DOCUMENT_REGISTRY_PACKAGE_ID}::document_registry::DocumentRegistry`,
      },
      options: {
        showContent: true,
      },
    });

    if (objects.data.length > 0) {
      return objects.data[0].data?.objectId || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to get user registry:', error);
    return null;
  }
}

/**
 * Create a new document registry transaction
 */
function createRegistryTransaction(userAddr: string): Transaction {
  const tx = new Transaction();
  tx.setSender(userAddr);

  tx.moveCall({
    target: `${DOCUMENT_REGISTRY_PACKAGE_ID}::document_registry::create_registry`,
    arguments: [],
  });

  return tx;
}

/**
 * Build document registration transaction
 */
async function buildDocumentRegistrationTransaction(
  suiClient: SuiClient,
  userAddr: string,
  file: File,
  walrusBlobId: string,
  registryId: string
): Promise<{ transaction: Transaction; documentId: string; estimatedGas: number }> {
  const fileHash = await calculateFileHash(file);
  const documentId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const tx = new Transaction();
  tx.setSender(userAddr);

  // Serialize the file hash as vector<u8> using BCS
  const fileHashBytes = bcs.vector(bcs.u8()).serialize(Array.from(fileHash));

  tx.moveCall({
    target: `${DOCUMENT_REGISTRY_PACKAGE_ID}::document_registry::register_document`,
    arguments: [
      tx.object(registryId),
      tx.pure.string(documentId),
      tx.pure.string(file.name),
      tx.pure(fileHashBytes),
      tx.pure.u64(file.size),
      tx.pure.string(file.type || 'application/octet-stream'),
      tx.pure.string(walrusBlobId),
    ],
  });

  // Estimate gas
  let estimatedGas = 10000000; // Default: 0.01 SUI
  try {
    const dryRun = await suiClient.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: suiClient }),
    });
    const gasUsed = dryRun.effects.gasUsed;
    estimatedGas =
      parseInt(gasUsed.computationCost) +
      parseInt(gasUsed.storageCost) -
      parseInt(gasUsed.storageRebate);
  } catch (error) {
    console.error('Gas estimation failed:', error);
  }

  return { transaction: tx, documentId, estimatedGas };
}

/**
 * Format gas cost for display
 */
function formatGasCost(gasCost: number): string {
  const sui = gasCost / 1_000_000_000;
  return `${sui.toFixed(6)} SUI`;
}

/**
 * Upload document with wallet signing
 * Complete flow: Upload to Walrus → Build transaction → Sign → Confirm
 */
export async function uploadDocumentWithWallet(
  file: File,
  userAddr: string,
  signAndExecuteTransaction: (tx: { transaction: Transaction }) => Promise<{ digest: string }>,
  suiClient: SuiClient,
  options?: DocumentUploadOptions
): Promise<DocumentUploadResult> {
  try {
    const { onProgress, onNeedsRegistry } = options || {};

    if (!userAddr) {
      return {
        success: false,
        error: 'Not connected',
        details: 'Please connect your wallet first',
      };
    }

    // Step 1: Upload file to Walrus
    onProgress?.({
      stage: 'uploading',
      message: 'Uploading file to Walrus...',
      progress: 10,
    });

    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('/api/upload/walrus', {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-address': userAddr,
      },
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      return {
        success: false,
        error: 'Upload failed',
        details: error.error || 'Failed to upload file to Walrus',
      };
    }

    const uploadData = await uploadResponse.json();
    const { blobId, filename, fileType, size } = uploadData;

    // Step 2: Check if user has registry
    onProgress?.({
      stage: 'building_tx',
      message: 'Checking document registry...',
      progress: 40,
    });

    let registryId = await getUserRegistry(suiClient, userAddr);

    // If no registry exists, create one
    if (!registryId) {
      onProgress?.({
        stage: 'building_tx',
        message: 'Creating document registry...',
        progress: 45,
      });

      const shouldCreate = await onNeedsRegistry?.();
      if (!shouldCreate) {
        return {
          success: false,
          error: 'Registry creation required',
          details: 'You need to create a document registry first',
        };
      }

      // Create registry transaction
      const createTx = createRegistryTransaction(userAddr);

      try {
        const createResult = await signAndExecuteTransaction({ transaction: createTx });
        console.log('Registry creation transaction result:', createResult);

        if (!createResult.digest) {
          return {
            success: false,
            error: 'Registry creation failed',
            details: 'Failed to create document registry',
          };
        }

        console.log('Registry created, transaction digest:', createResult.digest);

        // Get the transaction details to extract created objects
        const txResponse = await suiClient.waitForTransaction({
          digest: createResult.digest,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        console.log('Transaction response:', txResponse);

        // Extract the created registry object ID from transaction effects
        if (txResponse.objectChanges) {
          const createdObject = txResponse.objectChanges.find(
            (change) => change.type === 'created' &&
            change.objectType?.includes('DocumentRegistry')
          );

          if (createdObject && 'objectId' in createdObject) {
            registryId = createdObject.objectId;
            console.log('Registry extracted from transaction:', registryId);
          }
        }

        // If we still don't have it, try the old method
        if (!registryId) {
          console.log('Falling back to query method...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          registryId = await getUserRegistry(suiClient, userAddr);
          console.log('Registry from query:', registryId);
        }

        if (!registryId) {
          return {
            success: false,
            error: 'Registry not found',
            details: `Registry created (tx: ${createResult.digest.slice(0, 10)}...) but could not extract object ID. Please try uploading again.`,
          };
        }

        console.log('Using registry:', registryId);
      } catch (error) {
        console.error('Registry creation error:', error);
        return {
          success: false,
          error: 'Registry creation failed',
          details: error instanceof Error ? error.message : 'Unknown error during registry creation',
        };
      }
    }

    // Step 3: Build registration transaction
    onProgress?.({
      stage: 'building_tx',
      message: 'Building blockchain transaction...',
      progress: 50,
    });

    const { transaction, documentId, estimatedGas } = await buildDocumentRegistrationTransaction(
      suiClient,
      userAddr,
      file,
      blobId,
      registryId
    );

    // Step 4: Sign and execute transaction
    onProgress?.({
      stage: 'signing',
      message: `Signing transaction (Gas: ${formatGasCost(estimatedGas)})...`,
      progress: 60,
    });

    const txResult = await signAndExecuteTransaction({ transaction });

    if (!txResult.digest) {
      return {
        success: false,
        error: 'Transaction signing failed',
        details: 'Failed to sign and execute transaction',
      };
    }

    // Step 5: Confirm upload
    onProgress?.({
      stage: 'confirming',
      message: 'Confirming upload...',
      progress: 80,
    });

    const confirmResponse = await fetch('/api/upload/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-address': userAddr,
      },
      body: JSON.stringify({
        documentId,
        filename: filename || file.name,
        fileType: fileType || file.type,
        fileSize: size || file.size,
        walrusBlobId: blobId,
        vectorsBlobId: undefined,
        pageCount: undefined,
        chunkCount: 0,
        transactionDigest: txResult.digest,
      }),
    });

    const confirmData = await confirmResponse.json();

    if (!confirmData.success) {
      return {
        success: false,
        error: confirmData.error || 'Confirmation failed',
        details: confirmData.details,
      };
    }

    // Step 6: Trigger document ingestion (indexing for RAG)
    onProgress?.({
      stage: 'confirming',
      message: 'Indexing document for search...',
      progress: 90,
    });

    try {
      // Read file content as text
      const fileContent = await file.text();

      const ingestResponse = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-address': userAddr,
        },
        body: JSON.stringify({
          content: fileContent,
          filename: filename || file.name,
        }),
      });

      if (!ingestResponse.ok) {
        const errorText = await ingestResponse.text();
        console.warn('Document ingestion failed (non-critical):', errorText);
      } else {
        const ingestData = await ingestResponse.json();
        console.log('Document indexed successfully:', ingestData);
      }
    } catch (error) {
      console.warn('Document ingestion error (non-critical):', error);
    }

    // Step 7: Complete
    onProgress?.({
      stage: 'complete',
      message: 'Document uploaded successfully!',
      progress: 100,
    });

    return {
      success: true,
      documentId: confirmData.documentId,
      transactionDigest: txResult.digest,
    };
  } catch (error: unknown) {
    console.error('Document upload failed:', error);
    return {
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
