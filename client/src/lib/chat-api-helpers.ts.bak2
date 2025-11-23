/**
 * Chat API Helpers for server-side operations
 * Manages user-specific chat registries
 */

import { ChatService } from '@/services/chat-service';
import { ChatRegistryClient } from '@/services/chat-registry-client';
import { metadataRegistry } from '@/services/metadata-registry';

// In-memory cache for user registry mappings (server-side)
// This cache speeds up repeated requests within the same server session
const userRegistryCache = new Map<string, string>();

/**
 * Get user-specific chat registry
 * Returns null if user hasn't created a registry yet (needs to sign tx)
 * Persists registry IDs in Sui metadata registry for permanent storage
 */
export async function getUserChatService(userAddr: string): Promise<ChatService | null> {
  // Layer 1: Check in-memory cache (fastest)
  let registryId = userRegistryCache.get(userAddr);

  if (registryId) {
    console.log(`[Cache Hit] Using cached registry ${registryId.slice(0, 10)}... for user ${userAddr.slice(0, 10)}...`);
    const chatService = new ChatService(registryId, userAddr);
    return chatService;
  }

  // Layer 2: Check Sui metadata registry (persistent)
  // Use special suffix _chat_registry to distinguish from chat metadata blobs
  const registryKey = `${userAddr}_chat_registry`;
  const storedRegistryId = await metadataRegistry.getMetadataBlobId(registryKey);

  if (storedRegistryId) {
    registryId = storedRegistryId;
    console.log(`[Sui Hit] Found existing registry ${registryId.slice(0, 10)}... for user ${userAddr.slice(0, 10)}...`);
    // Cache for future requests
    userRegistryCache.set(userAddr, registryId);
    const chatService = new ChatService(registryId, userAddr);
    return chatService;
  }

  // Layer 3: No registry found - user needs to create one via wallet
  console.log(`[No Registry] User ${userAddr.slice(0, 10)}... needs to create registry via wallet`);
  return null;
}

/**
 * Store user's registry ID after they create it via wallet
 */
export async function storeUserRegistry(userAddr: string, registryId: string): Promise<void> {
  const registryKey = `${userAddr}_chat_registry`;

  // Store in metadata registry (file cache + optional Sui)
  await metadataRegistry.setMetadataBlobId(registryKey, registryId);

  // Cache for future requests
  userRegistryCache.set(userAddr, registryId);

  console.log(`[Stored] Registry ${registryId.slice(0, 10)}... for user ${userAddr.slice(0, 10)}...`);
}

/**
 * Clear user registry cache (for testing/development)
 */
export function clearUserRegistryCache(): void {
  userRegistryCache.clear();
}

/**
 * Get cached registry ID for user
 */
export function getCachedRegistryId(userAddr: string): string | undefined {
  return userRegistryCache.get(userAddr);
}

/**
 * Set registry ID for user in cache
 */
export function setCachedRegistryId(userAddr: string, registryId: string): void {
  userRegistryCache.set(userAddr, registryId);
}
