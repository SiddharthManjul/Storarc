/**
 * SEAL Service - Enterprise-grade encryption service using Mysten's SEAL
 * Provides client-side encryption, decryption, and session management
 */

import { SealClient, SessionKey, EncryptedObject } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// SEAL Key Server Configuration (Testnet)
// These are public SEAL key servers operated by Mysten and the community
const DEFAULT_KEY_SERVERS = [
  {
    objectId: '0x...', // TODO: Add actual testnet key server object IDs
    weight: 1,
  },
  {
    objectId: '0x...', // TODO: Add actual testnet key server object IDs
    weight: 1,
  },
];

const DEFAULT_THRESHOLD = 2; // Require 2 out of 2 servers
const SESSION_TTL_MINUTES = 60; // 1 hour session lifetime

export interface SealConfig {
  suiClient: SuiClient;
  accessControlPackageId: string;
  keyServers?: Array<{ objectId: string; weight: number }>;
  threshold?: number;
  verifyKeyServers?: boolean;
}

export interface EncryptionOptions {
  data: Uint8Array | Buffer;
  policyId: string;
  userAddress: string;
  threshold?: number;
}

export interface DecryptionOptions {
  encryptedObject: Uint8Array | Buffer;
  policyId: string;
  userAddress: string;
  sessionKey?: SessionKey;
}

export interface EncryptionResult {
  encryptedData: Uint8Array;
  encryptedObjectId: string;
  backupKey?: string;
  metadata: {
    algorithm: 'aes' | 'hmac';
    threshold: number;
    keyServerIds: string[];
    encryptedAt: number;
  };
}

/**
 * SEAL Service for document and chat encryption
 */
export class SealService {
  private sealClient: SealClient;
  private config: SealConfig;
  private sessionKeys: Map<string, SessionKey> = new Map();

  constructor(config: SealConfig) {
    this.config = config;

    const keyServers = config.keyServers || DEFAULT_KEY_SERVERS;
    const threshold = config.threshold || DEFAULT_THRESHOLD;

    this.sealClient = new SealClient({
      suiClient: config.suiClient,
      serverConfigs: keyServers,
      threshold,
      verifyKeyServers: config.verifyKeyServers ?? false,
    });

    console.log('✓ SEAL Service initialized');
    console.log(`  Threshold: ${threshold} of ${keyServers.length} key servers`);
  }

  /**
   * Encrypt data using SEAL
   * Returns encrypted data and metadata needed for decryption
   */
  async encrypt(options: EncryptionOptions): Promise<EncryptionResult> {
    const { data, policyId, userAddress, threshold } = options;

    try {
      // Convert data to Uint8Array if it's a Buffer
      const dataArray = data instanceof Buffer ? new Uint8Array(data) : data;

      // Encrypt using SEAL with AES (recommended for general use)
      const { encryptedObject, key } = await this.sealClient.encrypt({
        threshold: threshold || this.config.threshold || DEFAULT_THRESHOLD,
        packageId: this.config.accessControlPackageId,
        id: policyId, // Access policy object ID
        data: dataArray,
      });

      // Parse encrypted object to get metadata
      const parsedObject = new EncryptedObject(encryptedObject);

      return {
        encryptedData: encryptedObject,
        encryptedObjectId: policyId,
        backupKey: key ? Buffer.from(key).toString('hex') : undefined,
        metadata: {
          algorithm: 'aes',
          threshold: threshold || this.config.threshold || DEFAULT_THRESHOLD,
          keyServerIds: this.config.keyServers?.map(s => s.objectId) || [],
          encryptedAt: Date.now(),
        },
      };
    } catch (error) {
      console.error('SEAL encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data using SEAL
   * Requires a valid session key with approval transaction
   */
  async decrypt(options: DecryptionOptions): Promise<Uint8Array> {
    const { encryptedObject, policyId, userAddress, sessionKey } = options;

    try {
      // Get or create session key
      const activeSessionKey = sessionKey || await this.getOrCreateSessionKey(userAddress);

      // Convert to Uint8Array if needed
      const encryptedArray = encryptedObject instanceof Buffer
        ? new Uint8Array(encryptedObject)
        : encryptedObject;

      // This will require the user to sign an approval transaction
      // The transaction calls seal_approve_document_access on the access policy
      const decryptedData = await this.sealClient.decrypt({
        encryptedObject: encryptedArray,
        sessionKey: activeSessionKey,
      });

      return decryptedData;
    } catch (error) {
      console.error('SEAL decryption failed:', error);
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Access denied or invalid key'}`);
    }
  }

  /**
   * Get or create a session key for a user
   * Session keys are cached and reused within their TTL
   */
  async getOrCreateSessionKey(userAddress: string): Promise<SessionKey> {
    // Check if we have a valid cached session key
    const cached = this.sessionKeys.get(userAddress);
    if (cached && await this.isSessionKeyValid(cached)) {
      return cached;
    }

    // Create new session key
    const sessionKey = await SessionKey.create({
      suiClient: this.config.suiClient,
      userAddress,
      ttlMinutes: SESSION_TTL_MINUTES,
    });

    // Cache it
    this.sessionKeys.set(userAddress, sessionKey);

    // Set up auto-cleanup when it expires
    setTimeout(() => {
      this.sessionKeys.delete(userAddress);
    }, SESSION_TTL_MINUTES * 60 * 1000);

    return sessionKey;
  }

  /**
   * Check if a session key is still valid
   */
  private async isSessionKeyValid(sessionKey: SessionKey): Promise<boolean> {
    try {
      // Session keys have an internal expiry check
      // We can verify by attempting to get its status
      return sessionKey.isValid();
    } catch {
      return false;
    }
  }

  /**
   * Create an approval transaction for SEAL
   * This transaction calls the seal_approve_document_access function
   */
  async createApprovalTransaction(
    policyId: string,
    requesterAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();

    // Call the SEAL approval function on the access policy
    tx.moveCall({
      target: `${this.config.accessControlPackageId}::access_control::seal_approve_document_access`,
      arguments: [
        tx.object(this.config.accessControlPackageId), // package_id
        tx.object(policyId), // policy object
        tx.pure.address(requesterAddress), // requester
      ],
    });

    return tx;
  }

  /**
   * Batch decrypt multiple encrypted objects
   * More efficient than individual decrypt calls
   */
  async batchDecrypt(
    items: Array<{
      encryptedObject: Uint8Array | Buffer;
      policyId: string;
    }>,
    userAddress: string
  ): Promise<Array<Uint8Array | null>> {
    const sessionKey = await this.getOrCreateSessionKey(userAddress);

    const results = await Promise.allSettled(
      items.map(item =>
        this.decrypt({
          ...item,
          userAddress,
          sessionKey,
        })
      )
    );

    return results.map(result =>
      result.status === 'fulfilled' ? result.value : null
    );
  }

  /**
   * Clear cached session keys (call on logout)
   */
  clearSessionKeys(): void {
    this.sessionKeys.clear();
  }

  /**
   * Get session key for a user (if exists)
   */
  getSessionKey(userAddress: string): SessionKey | undefined {
    return this.sessionKeys.get(userAddress);
  }
}

/**
 * Singleton instance - initialized when needed
 */
let sealServiceInstance: SealService | null = null;

export function initializeSealService(config: SealConfig): SealService {
  sealServiceInstance = new SealService(config);
  return sealServiceInstance;
}

export function getSealService(): SealService {
  if (!sealServiceInstance) {
    throw new Error('SEAL Service not initialized. Call initializeSealService first.');
  }
  return sealServiceInstance;
}
