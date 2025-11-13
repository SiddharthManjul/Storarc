/**
 * Cache Manager Service
 * Handles vector store initialization and automatic sync
 */

import { vectorStoreService } from '@/services/vector-store';
import { eventSyncService } from '@/services/event-sync';
import { config } from '@/config';

class CacheManager {
  private isInitialized = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize cache on server startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✓ Cache manager already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing vector store cache...');

      // Initialize vector store (syncs from Sui + Walrus if needed)
      await vectorStoreService.initialize();

      const stats = vectorStoreService.getStats();
      console.log(`✓ Vector store ready: ${stats.totalVectors} vectors (version ${stats.version})`);

      // Start background sync
      this.startBackgroundSync();

      // Start event listener for real-time sync
      if (!process.env.DISABLE_AUTO_SYNC) {
        try {
          await eventSyncService.start();
          console.log('✓ Event sync service started');
        } catch (error) {
          console.warn('⚠️  Event sync not available:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      this.isInitialized = true;
      console.log('✅ Cache manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize cache manager:', error);
      throw error;
    }
  }

  /**
   * Start periodic background sync
   */
  private startBackgroundSync() {
    const interval = config.vectorStore.autoSyncInterval;

    console.log(`🔄 Starting background sync (every ${interval / 1000 / 60} minutes)`);

    this.syncInterval = setInterval(async () => {
      try {
        const wasStale = await vectorStoreService.syncIfStale();
        if (wasStale) {
          const stats = vectorStoreService.getStats();
          console.log(`🔄 Background sync completed: ${stats.totalVectors} vectors (version ${stats.version})`);
        }
      } catch (error) {
        console.error('⚠️  Background sync failed:', error);
      }
    }, interval);
  }

  /**
   * Stop background sync and cleanup
   */
  async shutdown() {
    console.log('🛑 Shutting down cache manager...');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    try {
      await eventSyncService.stop();
      console.log('✓ Event sync stopped');
    } catch (error) {
      console.warn('⚠️  Error stopping event sync:', error);
    }

    this.isInitialized = false;
    console.log('✅ Cache manager shutdown complete');
  }

  /**
   * Force sync from registry
   */
  async forceSync(): Promise<void> {
    console.log('🔄 Forcing cache sync...');
    await vectorStoreService.initialize();
    const stats = vectorStoreService.getStats();
    console.log(`✓ Force sync complete: ${stats.totalVectors} vectors (version ${stats.version})`);
  }

  /**
   * Get cache status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      stats: vectorStoreService.getStats(),
      config: {
        autoSyncInterval: config.vectorStore.autoSyncInterval,
        autoSyncEnabled: !process.env.DISABLE_AUTO_SYNC,
      },
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Initialize on module load (when server starts)
if (typeof window === 'undefined') {
  // Only run on server side
  cacheManager.initialize().catch((error) => {
    console.error('Failed to auto-initialize cache:', error);
  });

  // Cleanup on process exit
  process.on('SIGTERM', () => cacheManager.shutdown());
  process.on('SIGINT', () => cacheManager.shutdown());
}
