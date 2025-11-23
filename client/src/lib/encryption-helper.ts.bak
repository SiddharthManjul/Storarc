/**
 * Encryption Helper for Private Document Uploads
 * Handles SEAL encryption and access policy creation
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { bcs } from '@mysten/sui/bcs';

const ACCESS_CONTROL_PACKAGE_ID = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID ||
  '0x55931317f860d14eb60407236de81eb8519b165fffd2e851f8931a132884f95c';

export interface EncryptionResult {
  encryptedBlob: Blob;
  encryptedBlobId?: string;
  policyId?: string;
  policyTransactionDigest?: string;
}

/**
 * Create an access policy on Sui for a document
 * Returns the transaction for the user to sign
 */
export async function createAccessPolicyTransaction(
  documentId: string,
  userAddr: string,
  isPublic: boolean,
  suiClient: SuiClient
): Promise<Transaction> {
  console.log('🔐 Creating access policy transaction:', {
    documentId,
    owner: userAddr,
    isPublic,
    packageId: ACCESS_CONTROL_PACKAGE_ID,
  });

  const tx = new Transaction();
  tx.setSender(userAddr);

  // Convert documentId to bytes for Sui contract
  const documentIdBytes = new TextEncoder().encode(documentId);

  tx.moveCall({
    target: `${ACCESS_CONTROL_PACKAGE_ID}::access_control::create_policy`,
    arguments: [
      tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(documentIdBytes))),
      tx.pure.bool(isPublic),
    ],
  });

  return tx;
}

/**
 * Extract policy ID from transaction result
 */
export async function getPolicyIdFromTransaction(
  suiClient: SuiClient,
  txDigest: string
): Promise<string | null> {
  try {
    const txResponse = await suiClient.waitForTransaction({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (txResponse.objectChanges) {
      const createdPolicy = txResponse.objectChanges.find(
        (change) =>
          change.type === 'created' &&
          change.objectType?.includes('AccessPolicy')
      );

      if (createdPolicy && 'objectId' in createdPolicy) {
        console.log('✅ Access policy created:', createdPolicy.objectId);
        return createdPolicy.objectId;
      }
    }

    // Fallback: try to find in created objects
    if (txResponse.effects?.created) {
      for (const created of txResponse.effects.created) {
        if ('reference' in created) {
          const objectId = created.reference.objectId;
          // Verify it's an AccessPolicy by fetching the object
          try {
            const obj = await suiClient.getObject({
              id: objectId,
              options: { showType: true },
            });
            if (obj.data?.type?.includes('AccessPolicy')) {
              console.log('✅ Access policy found (fallback):', objectId);
              return objectId;
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    console.warn('⚠️  Could not extract policy ID from transaction');
    return null;
  } catch (error) {
    console.error('❌ Failed to get policy ID:', error);
    return null;
  }
}

/**
 * Encrypt file content using simple encryption (mock SEAL for now)
 * TODO: Replace with actual SEAL encryption when key servers are fully configured
 */
export async function encryptFileContent(
  file: File,
  userAddr: string
): Promise<{ encryptedContent: Uint8Array; metadata: any }> {
  console.log('🔒 Encrypting file:', {
    filename: file.name,
    size: file.size,
    owner: userAddr,
  });

  // Read file content
  const arrayBuffer = await file.arrayBuffer();
  const content = new Uint8Array(arrayBuffer);

  // For now, use simple encryption marker
  // In production, this should use SEAL encryption with key servers
  const encryptionMarker = new TextEncoder().encode('SEAL_ENCRYPTED_V1:');
  const ownerBytes = new TextEncoder().encode(userAddr + ':');

  const encryptedContent = new Uint8Array(
    encryptionMarker.length + ownerBytes.length + content.length
  );

  encryptedContent.set(encryptionMarker, 0);
  encryptedContent.set(ownerBytes, encryptionMarker.length);
  encryptedContent.set(content, encryptionMarker.length + ownerBytes.length);

  console.log('✅ File encrypted (mock SEAL):', {
    originalSize: content.length,
    encryptedSize: encryptedContent.length,
    marker: 'SEAL_ENCRYPTED_V1',
  });

  return {
    encryptedContent,
    metadata: {
      algorithm: 'mock-seal-v1',
      owner: userAddr,
      encryptedAt: Date.now(),
    },
  };
}

/**
 * Decrypt file content (mock implementation)
 * TODO: Replace with actual SEAL decryption
 */
export async function decryptFileContent(
  encryptedContent: Uint8Array,
  userAddr: string
): Promise<Uint8Array> {
  const marker = new TextEncoder().encode('SEAL_ENCRYPTED_V1:');

  // Verify marker
  const contentMarker = encryptedContent.slice(0, marker.length);
  if (!arraysEqual(contentMarker, marker)) {
    throw new Error('Invalid encryption marker - file may not be encrypted');
  }

  // Extract owner
  let offset = marker.length;
  let ownerEnd = offset;
  while (ownerEnd < encryptedContent.length && encryptedContent[ownerEnd] !== 58) { // 58 = ':'
    ownerEnd++;
  }

  const ownerBytes = encryptedContent.slice(offset, ownerEnd);
  const owner = new TextDecoder().decode(ownerBytes);

  console.log('🔓 Decrypting file:', {
    owner,
    requestedBy: userAddr,
  });

  // Simple access check (in production, this would be done via SEAL + Sui policy)
  if (owner !== userAddr) {
    console.error('❌ Access denied:', {
      owner,
      requestedBy: userAddr,
    });
    throw new Error('Access denied: You do not have permission to decrypt this document');
  }

  // Return decrypted content (skip marker and owner)
  const decryptedContent = encryptedContent.slice(ownerEnd + 1);

  console.log('✅ File decrypted successfully:', {
    decryptedSize: decryptedContent.length,
  });

  return decryptedContent;
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
