import { NextResponse } from 'next/server';
import { vectorStoreService } from '@/services/vector-store';
import { suiVectorRegistry } from '@/services/sui-vector-registry';

/**
 * Get vector store and registry status
 * GET /api/status
 */
export async function GET() {
  try {
    // Get registry stats from Sui
    const registryStats = await suiVectorRegistry.getRegistryStats();

    // Get local cache info
    const localStats = vectorStoreService.getStats();

    return NextResponse.json({
      registry: {
        totalDocuments: registryStats.totalDocuments,
        version: registryStats.version,
        owner: registryStats.owner,
      },
      localCache: {
        totalVectors: localStats.totalVectors,
        version: localStats.version,
        isStale: registryStats.version > localStats.version,
        // lastSync: localStats.lastSync, // Property doesn't exist in VectorStoreStats
      },
      status: 'ok',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    );
  }
}
