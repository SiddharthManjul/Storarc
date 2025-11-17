/**
 * Chat API Helpers for server-side operations
 * Manages user-specific chat registries
 */

import { ChatService } from '@/services/chat-service';
import { ChatRegistryClient } from '@/services/chat-registry-client';

// In-memory cache for user registry mappings (server-side)
// In production, this should be stored in a database
const userRegistryCache = new Map<string, string>();

/**
 * Get or create user-specific chat registry
 */
export async function getUserChatService(userAddr: string): Promise<ChatService> {
  // Check cache first
  let registryId = userRegistryCache.get(userAddr);

  if (!registryId) {
    // Try to find existing registry for this user
    // In a real implementation, you would query a database
    // For now, create a new registry if not found
    const chatClient = new ChatRegistryClient();
    registryId = await chatClient.createRegistry();

    // Cache the registry ID
    userRegistryCache.set(userAddr, registryId);

    console.log(`Created new registry ${registryId} for user ${userAddr}`);
  }

  // Create ChatService with user-specific registry
  const chatService = new ChatService(registryId, userAddr);
  return chatService;
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
