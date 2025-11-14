#!/usr/bin/env node
/**
 * Sync cache from Sui registry
 * Usage: npm run sync
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
loadEnv({ path: resolve(process.cwd(), '.env.local') });

import { vectorStoreService } from '../services/vector-store';
import { suiVectorRegistry } from '../services/sui-vector-registry';

async function main() {
  try {
    console.log('\n🔄 Syncing cache from Sui registry...\n');

    // Initialize if needed
    if (!vectorStoreService.isInitialized()) {
      await vectorStoreService.initialize();
    }

    // Get current stats
    const beforeStats = vectorStoreService.getStats();
    console.log(`Before sync:`);
    console.log(`  Vectors: ${beforeStats.totalVectors}`);
    console.log(`  Version: ${beforeStats.version}\n`);

    // Check registry
    const registryStats = await suiVectorRegistry.getRegistryStats();
    console.log(`Registry:`);
    console.log(`  Documents: ${registryStats.totalDocuments}`);
    console.log(`  Version: ${registryStats.version}\n`);

    // Sync if stale
    const wasSynced = await vectorStoreService.syncIfStale();

    if (wasSynced) {
      const afterStats = vectorStoreService.getStats();
      console.log('✅ Cache synced successfully!');
      console.log(`  Vectors: ${afterStats.totalVectors}`);
      console.log(`  Version: ${afterStats.version}\n`);
    } else {
      console.log('✓ Cache is already up to date\n');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
