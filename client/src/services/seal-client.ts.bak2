import { config } from '../config/index.js';
import { AccessControlPolicy } from '../types/index.js';
import * as crypto from 'crypto';

/**
 * Seal Client for document encryption and access control
 *
 * Day 3 Implementation Guide:
 * 1. Install Seal SDK: npm install @mysten/seal-sdk (when available)
 * 2. Implement proper encryption using Seal's decentralized key management
 * 3. Store access policies on Sui blockchain
 * 4. Integrate with Sui wallet for authentication
 */

export class SealClient {
  private policies: Map<string, AccessControlPolicy> = new Map();

  constructor() {
    console.log('⚠️  Note: Using mock encryption. Integrate Seal SDK on Day 3');
  }

  /**
   * Encrypt document content
   *
   * TODO Day 3: Replace with Seal SDK encryption
   */
  async encryptDocument(content: string, owner: string): Promise<{
    encrypted: Buffer;
    encryptionKey: string;
  }> {
    // Mock encryption for MVP
    // In production, use Seal's decentralized encryption
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(content, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Store IV with encrypted data
    const encryptedWithIv = Buffer.concat([iv, encrypted]);

    return {
      encrypted: encryptedWithIv,
      encryptionKey: key.toString('hex'),
    };
  }

  /**
   * Decrypt document content
   *
   * TODO Day 3: Replace with Seal SDK decryption
   */
  async decryptDocument(encrypted: Buffer, encryptionKey: string): Promise<string> {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(encryptionKey, 'hex');

    // Extract IV (first 16 bytes) and encrypted data
    const iv = encrypted.slice(0, 16);
    const encryptedData = encrypted.slice(16);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Create access control policy for a document
   *
   * TODO Day 3: Store on Sui blockchain via smart contract
   */
  async createAccessPolicy(
    documentId: string,
    owner: string,
    isPublic: boolean = false,
    allowedUsers: string[] = []
  ): Promise<AccessControlPolicy> {
    const policy: AccessControlPolicy = {
      documentId,
      owner,
      allowedUsers,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(documentId, policy);

    console.log(`✓ Created access policy for ${documentId}`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Public: ${isPublic}`);
    console.log(`  Allowed users: ${allowedUsers.length}`);

    return policy;
  }

  /**
   * Check if user has access to a document
   */
  async checkAccess(documentId: string, userId: string): Promise<boolean> {
    const policy = this.policies.get(documentId);

    if (!policy) {
      // No policy = public access (for MVP)
      return true;
    }

    // Owner always has access
    if (policy.owner === userId) {
      return true;
    }

    // Public documents are accessible to all
    if (policy.isPublic) {
      return true;
    }

    // Check if user is in allowed list
    return policy.allowedUsers.includes(userId);
  }

  /**
   * Grant access to a user
   *
   * TODO Day 3: Update Sui smart contract
   */
  async grantAccess(documentId: string, userId: string, grantedBy: string): Promise<void> {
    const policy = this.policies.get(documentId);

    if (!policy) {
      throw new Error('Policy not found');
    }

    if (policy.owner !== grantedBy) {
      throw new Error('Only owner can grant access');
    }

    if (!policy.allowedUsers.includes(userId)) {
      policy.allowedUsers.push(userId);
      policy.updatedAt = new Date();
      console.log(`✓ Granted access to ${userId} for document ${documentId}`);
    }
  }

  /**
   * Revoke access from a user
   *
   * TODO Day 3: Update Sui smart contract
   */
  async revokeAccess(documentId: string, userId: string, revokedBy: string): Promise<void> {
    const policy = this.policies.get(documentId);

    if (!policy) {
      throw new Error('Policy not found');
    }

    if (policy.owner !== revokedBy) {
      throw new Error('Only owner can revoke access');
    }

    const index = policy.allowedUsers.indexOf(userId);
    if (index > -1) {
      policy.allowedUsers.splice(index, 1);
      policy.updatedAt = new Date();
      console.log(`✓ Revoked access from ${userId} for document ${documentId}`);
    }
  }

  /**
   * Get access policy for a document
   */
  async getPolicy(documentId: string): Promise<AccessControlPolicy | null> {
    return this.policies.get(documentId) || null;
  }

  /**
   * List all documents owned by a user
   */
  async getOwnedDocuments(owner: string): Promise<string[]> {
    const owned: string[] = [];

    for (const [docId, policy] of this.policies.entries()) {
      if (policy.owner === owner) {
        owned.push(docId);
      }
    }

    return owned;
  }

  /**
   * List all documents accessible by a user
   */
  async getAccessibleDocuments(userId: string): Promise<string[]> {
    const accessible: string[] = [];

    for (const [docId, policy] of this.policies.entries()) {
      if (await this.checkAccess(docId, userId)) {
        accessible.push(docId);
      }
    }

    return accessible;
  }
}

// Singleton instance
export const sealClient = new SealClient();
