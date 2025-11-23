/**
 * Metadata Registry - Sui-Based Persistent Storage
 * Stores user metadata blob IDs on Sui blockchain
 * Provides automatic fallback and works on all platforms
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { config } from '@/config';
import * as fs from 'fs/promises';
import * as path from 'path';

// Server-side cache (ephemeral, for performance)
const serverCache = new Map<string, string>();

// File-based cache path
const CACHE_DIR = path.join(process.cwd(), 'data', 'metadata-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'blob-ids.json');

export interface MetadataRegistryEntry {
  userAddr: string;
  metadataBlobId: string;
  lastUpdated: number;
}

/**
 * Metadata Registry Service
 * Manages user → metadata blob ID mappings on Sui
 */
export class MetadataRegistry {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private packageId: string;
  private registryObjectId: string;

  constructor() {
    this.client = new SuiClient({ url: config.sui.rpcUrl });

    // Initialize keypair
    const privateKey = config.sui.privateKey;
    if (privateKey.startsWith('suiprivkey')) {
      this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
    } else {
      const privateKeyBytes = privateKey.startsWith('0x')
        ? Buffer.from(privateKey.slice(2), 'hex')
        : Buffer.from(privateKey, 'base64');
      this.keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    }

    this.packageId = config.sui.chatRegistryPackageId;
    this.registryObjectId = config.sui.chatRegistryObjectId;
  }

  /**
   * Load file cache
   */
  private async loadFileCache(): Promise<Map<string, string>> {
    try {
      const data = await fs.readFile(CACHE_FILE, 'utf-8');
      const json = JSON.parse(data);
      return new Map(Object.entries(json));
    } catch {
      return new Map();
    }
  }

  /**
   * Save file cache
   */
  private async saveFileCache(cache: Map<string, string>): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const json = JSON.stringify(Object.fromEntries(cache), null, 2);
      await fs.writeFile(CACHE_FILE, json, 'utf-8');
    } catch (error) {
      console.error('Failed to save file cache:', error);
    }
  }

  /**
   * Get metadata blob ID with automatic fallback chain
   * IMPORTANT: File cache is the source of truth in multi-process environments (Next.js)
   * 1. File cache (source of truth, survives restarts & processes)
   * 2. Sui blockchain (reliable, decentralized)
   * 3. Return null (new user)
   */
  async getMetadataBlobId(userAddr: string): Promise<string | null> {
    // Layer 1: Check file cache (source of truth for multi-process)
    const fileCache = await this.loadFileCache();
    const fileCached = fileCache.get(userAddr);
    if (fileCached) {
      console.log(`[File Hit] Found metadata blob ID for ${userAddr.slice(0, 10)}...`);
      serverCache.set(userAddr, fileCached); // Update memory cache
      return fileCached;
    }

    // Layer 2: Query Sui blockchain (reliable, survives restarts)
    try {
      const blobId = await this.queryFromSui(userAddr);
      if (blobId) {
        console.log(`[Sui Hit] Found metadata blob ID for ${userAddr.slice(0, 10)}...`);
        // Cache for future requests
        serverCache.set(userAddr, blobId);
        fileCache.set(userAddr, blobId);
        await this.saveFileCache(fileCache);
        return blobId;
      }
    } catch (error) {
      console.error('Error querying Sui for metadata blob ID:', error);
    }

    // Layer 3: Not found (new user)
    console.log(`[New User] No metadata blob ID for ${userAddr.slice(0, 10)}...`);
    return null;
  }

  /**
   * Store metadata blob ID on Sui blockchain and file cache
   */
  async setMetadataBlobId(userAddr: string, blobId: string): Promise<void> {
    // Update memory cache (immediate availability)
    serverCache.set(userAddr, blobId);

    // Update file cache (survives restarts)
    const fileCache = await this.loadFileCache();
    fileCache.set(userAddr, blobId);
    await this.saveFileCache(fileCache);

    console.log(`[Stored] Metadata blob ID for ${userAddr.slice(0, 10)}... → ${blobId.slice(0, 20)}...`);

    // Skip Sui storage for now due to gas coin conflicts
    // TODO: Re-enable with user wallet signatures instead of backend keypair
  }

  /**
   * Query metadata blob ID from Sui using events
   * More reliable than dynamic field queries
   * Handles regular keys (chats), suffixed keys (documents), and registry keys
   */
  private async queryFromSui(userAddr: string): Promise<string | null> {
    try {
      // Determine key type and extract actual address
      let actualAddr: string;
      let keyPrefix: string;

      if (userAddr.endsWith('_chat_registry')) {
        // Chat registry ID storage
        actualAddr = userAddr.slice(0, -14); // Remove '_chat_registry'
        keyPrefix = 'registry:';
      } else if (userAddr.endsWith('_docs')) {
        // Document metadata storage
        actualAddr = userAddr.slice(0, -5); // Remove '_docs'
        keyPrefix = 'docs:';
      } else {
        // Chat metadata storage (default)
        actualAddr = userAddr;
        keyPrefix = 'chat:';
      }

      // Query MetadataUpdated events for this user
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::metadata_registry::MetadataUpdated`,
        },
        limit: 1000,
        order: 'descending', // Most recent first
      });

      // Find most recent event for this user with matching prefix
      for (const event of events.data) {
        const eventData = event.parsedJson as any;
        if (eventData.user_address === actualAddr) {
          const blobId = eventData.metadata_blob_id;
          // Check if blob ID matches the expected type
          if (blobId.startsWith(keyPrefix)) {
            // Return blob ID without prefix
            return blobId.slice(keyPrefix.length);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error querying Sui events:', error);
      return null;
    }
  }

  /**
   * Store metadata blob ID on Sui by emitting event
   * Handles regular keys (chats), suffixed keys (documents), and registry keys
   */
  private async storeOnSui(userAddr: string, blobId: string): Promise<void> {
    const tx = new Transaction();

    // Determine key type and extract actual address
    let actualAddr: string;
    let keyPrefix: string;

    if (userAddr.endsWith('_chat_registry')) {
      // Chat registry ID storage
      actualAddr = userAddr.slice(0, -14); // Remove '_chat_registry'
      keyPrefix = 'registry:';
    } else if (userAddr.endsWith('_docs')) {
      // Document metadata storage
      actualAddr = userAddr.slice(0, -5); // Remove '_docs'
      keyPrefix = 'docs:';
    } else {
      // Chat metadata storage (default)
      actualAddr = userAddr;
      keyPrefix = 'chat:';
    }

    // Add prefix to blob ID to differentiate between different types
    const prefixedBlobId = keyPrefix + blobId;

    // Call function that emits MetadataUpdated event
    tx.moveCall({
      target: `${this.packageId}::metadata_registry::update_metadata`,
      arguments: [
        tx.pure.address(actualAddr), // Use actual address without suffix
        tx.pure.string(prefixedBlobId), // Use prefixed blob ID
      ],
    });

    try {
      await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.keypair,
      });
    } catch (error) {
      // If Move call fails, it might be because the module doesn't exist
      // For MVP, we can continue without Sui storage (cache-only mode)
      console.warn('Sui storage unavailable, using cache-only mode:', error);
    }
  }

  /**
   * Clear server cache (for testing/development)
   */
  clearCache(): void {
    serverCache.clear();
    console.log('[Cache Cleared]');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: serverCache.size,
      entries: Array.from(serverCache.keys()).map(k => k.slice(0, 10) + '...'),
    };
  }
}

// Export singleton
export const metadataRegistry = new MetadataRegistry();
