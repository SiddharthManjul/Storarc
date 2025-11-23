import { suiVectorRegistry } from '@/services/sui-vector-registry';
import { vectorStoreService } from '@/services/vector-store';

/**
 * Event Sync Service
 * Handles real-time synchronization of vector store across instances
 * using Sui event subscriptions
 */
export class EventSyncService {
  private unsubscribe: (() => void) | null = null;
  private isActive: boolean = false;

  /**
   * Start listening to Sui registry events for real-time sync
   */
  async start(): Promise<void> {
    if (!suiVectorRegistry.isConfigured()) {
      console.log('⚠️  Sui registry not configured, event sync disabled');
      return;
    }

    if (this.isActive) {
      console.log('⚠️  Event sync already active');
      return;
    }

    try {
      console.log('📡 Starting real-time event sync...');

      this.unsubscribe = await suiVectorRegistry.subscribeToUpdates(
        async (event) => {
          try {
            await this.handleDocumentAdded(event);
          } catch (error) {
            console.error('Failed to handle document event:', error);
          }
        }
      );

      this.isActive = true;
      console.log('✓ Event sync started');
    } catch (error) {
      console.error('Failed to start event sync:', error);
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.isActive = false;
      console.log('✓ Event sync stopped');
    }
  }

  /**
   * Handle DocumentAdded event
   */
  private async handleDocumentAdded(event: any): Promise<void> {
    console.log(`\n🔔 New document detected: ${event.filename}`);
    console.log(`   Vector Blob ID: ${event.vector_blob_id}`);
    console.log(`   Document Blob ID: ${event.document_blob_id}`);
    console.log(`   Chunk Count: ${event.chunk_count}`);

    try {
      // Download vectors from Walrus
      console.log('   Downloading vectors from Walrus...');
      const vectors = await suiVectorRegistry.downloadVectors(event.vector_blob_id);

      // Add to local vector store
      console.log('   Updating local cache...');
      const { Document } = await import('@langchain/core/documents');

      const documents = vectors.map(v => new Document({
        pageContent: v.content,
        metadata: v.metadata,
      }));

      await vectorStoreService.addDocuments(documents);

      console.log(`   ✓ Synced ${vectors.length} vectors to local cache`);
      console.log(`✅ Auto-sync complete for: ${event.filename}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to sync document: ${event.filename}`, error);
    }
  }

  /**
   * Check if event sync is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Manually trigger a full sync
   */
  async fullSync(): Promise<void> {
    console.log('🔄 Triggering full sync from Sui registry...');
    await vectorStoreService.syncFromSuiRegistry();
    console.log('✓ Full sync complete');
  }
}

// Singleton instance
export const eventSyncService = new EventSyncService();

/**
 * Start event sync automatically on import (optional)
 * Can be disabled by setting DISABLE_AUTO_SYNC=true in .env
 */
export async function initializeEventSync(): Promise<void> {
  const autoSync = process.env.DISABLE_AUTO_SYNC !== 'true';

  if (autoSync && suiVectorRegistry.isConfigured()) {
    try {
      await eventSyncService.start();
    } catch (error) {
      console.warn('Auto event sync failed to start:', error);
    }
  }
}
