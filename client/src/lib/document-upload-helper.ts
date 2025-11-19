/**
 * Frontend Helper for Document Upload with Transaction Signing
 * Provides easy-to-use functions for React components
 */

import { Transaction } from '@mysten/sui/transactions';
import { zkLoginService } from '@/services/zklogin-service';
import { apiPost } from './api-client';

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
  onNeedsRegistry?: () => Promise<boolean>; // Called if user needs to create registry first
}

/**
 * Upload document with transaction signing
 * Complete flow: Upload to Walrus → Build transaction → Sign → Confirm
 */
export async function uploadDocumentWithTransaction(
  file: File,
  options?: DocumentUploadOptions
): Promise<DocumentUploadResult> {
  try {
    const { onProgress, onNeedsRegistry } = options || {};

    // Check authentication
    if (!zkLoginService.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated',
        details: 'Please login with zkLogin first',
      };
    }

    // Step 1: Upload file to Walrus (simple upload, no RAG processing)
    onProgress?.({
      stage: 'uploading',
      message: 'Uploading file to Walrus...',
      progress: 10,
    });

    const formData = new FormData();
    formData.append('file', file);

    // Upload to Walrus only (no RAG, no Sui registration)
    const uploadResponse = await fetch('/api/upload/walrus', {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-address': zkLoginService.getCurrentAccount()?.userAddr || '',
        'x-user-email': zkLoginService.getCurrentAccount()?.email || '',
        'x-user-name': zkLoginService.getCurrentAccount()?.name || '',
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

    // Step 2: Build registration transaction
    onProgress?.({
      stage: 'building_tx',
      message: 'Building blockchain transaction...',
      progress: 40,
    });

    const registerData = await apiPost('/api/upload/register', {
      filename: filename || file.name,
      fileType: fileType || file.type,
      fileSize: size || file.size,
      walrusBlobId: blobId,
    });

    // Check if user needs to create registry first
    if (registerData.needsRegistry) {
      onProgress?.({
        stage: 'building_tx',
        message: 'Creating document registry...',
        progress: 50,
      });

      // Ask user if they want to create registry
      const shouldCreate = await onNeedsRegistry?.();
      if (!shouldCreate) {
        return {
          success: false,
          error: 'Registry creation required',
          details: 'You need to create a document registry first',
        };
      }

      // Sign and execute registry creation transaction
      const createTx = Transaction.from(registerData.transaction);
      const createResult = await zkLoginService.signAndExecuteTransaction(createTx);

      if (!createResult.digest) {
        return {
          success: false,
          error: 'Registry creation failed',
          details: 'Failed to create document registry',
        };
      }

      // Wait a bit for transaction to finalize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try building registration transaction again
      const retryData = await apiPost('/api/upload/register', {
        filename: filename || file.name,
        fileType: fileType || file.type,
        fileSize: size || file.size,
        walrusBlobId: blobId,
      });
      if (retryData.needsRegistry) {
        return {
          success: false,
          error: 'Registry still not found',
          details: 'Please try again in a few seconds',
        };
      }

      // Use retry data for registration
      Object.assign(registerData, retryData);
    }

    if (!registerData.success) {
      return {
        success: false,
        error: registerData.error || 'Transaction build failed',
        details: registerData.details,
      };
    }

    // Step 3: Sign transaction
    onProgress?.({
      stage: 'signing',
      message: `Signing transaction (Gas: ${formatGasCost(registerData.estimatedGas)})...`,
      progress: 60,
    });

    const tx = Transaction.from(registerData.transaction);
    const txResult = await zkLoginService.signAndExecuteTransaction(tx);

    if (!txResult.digest) {
      return {
        success: false,
        error: 'Transaction signing failed',
        details: 'Failed to sign and execute transaction',
      };
    }

    // Step 4: Confirm upload
    onProgress?.({
      stage: 'confirming',
      message: 'Confirming upload...',
      progress: 80,
    });

    const confirmData = await apiPost('/api/upload/confirm', {
      documentId: registerData.documentId,
      filename: filename || file.name,
      fileType: fileType || file.type,
      fileSize: size || file.size,
      walrusBlobId: blobId,
      vectorsBlobId: undefined,
      pageCount: undefined,
      chunkCount: 0,
      transactionDigest: txResult.digest,
    });

    if (!confirmData.success) {
      return {
        success: false,
        error: confirmData.error || 'Confirmation failed',
        details: confirmData.details,
      };
    }

    // Step 5: Complete
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
  } catch (error: any) {
    console.error('Document upload failed:', error);
    return {
      success: false,
      error: 'Upload failed',
      details: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Create document registry for user
 * This is a one-time operation per user
 */
export async function createDocumentRegistry(
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: string; transactionDigest?: string }> {
  try {
    // Check authentication
    if (!zkLoginService.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated. Please login with zkLogin first.',
      };
    }

    const user = zkLoginService.getCurrentAccount();
    if (!user) {
      return {
        success: false,
        error: 'No user account found',
      };
    }

    onProgress?.('Building transaction...');

    // Build registry creation transaction
    const response = await apiPost('/api/upload/register', {
      filename: 'dummy',
      fileType: 'text/plain',
      fileSize: 0,
      walrusBlobId: 'dummy',
    });

    const data = await response.json();

    if (!data.needsRegistry) {
      return {
        success: true,
        error: 'Registry already exists',
      };
    }

    onProgress?.('Signing transaction...');

    // Sign and execute
    const tx = Transaction.from(data.transaction);
    const result = await zkLoginService.signAndExecuteTransaction(tx);

    if (!result.digest) {
      return {
        success: false,
        error: 'Transaction execution failed',
      };
    }

    onProgress?.('Registry created successfully!');

    return {
      success: true,
      transactionDigest: result.digest,
    };
  } catch (error: any) {
    console.error('Registry creation failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to create registry',
    };
  }
}

/**
 * Format gas cost for display
 */
function formatGasCost(gasCost: number): string {
  const sui = gasCost / 1_000_000_000;
  return `${sui.toFixed(6)} SUI`;
}

/**
 * Check if user has document registry
 */
export async function hasDocumentRegistry(): Promise<boolean> {
  try {
    const user = zkLoginService.getCurrentAccount();
    if (!user) return false;

    // Try to build a transaction - if needsRegistry is true, they don't have one
    const response = await apiPost('/api/upload/register', {
      filename: 'dummy',
      fileType: 'text/plain',
      fileSize: 0,
      walrusBlobId: 'dummy',
    });

    const data = await response.json();
    return !data.needsRegistry;
  } catch (error) {
    console.error('Failed to check registry:', error);
    return false;
  }
}
