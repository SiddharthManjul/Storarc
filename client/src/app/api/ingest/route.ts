import { NextRequest, NextResponse } from 'next/server';
import { ragService } from '@/services/rag-service';
import { vectorStoreService } from '@/services/vector-store';

/**
 * Ingest a document into the RAG system
 * POST /api/ingest
 * Body: { content: string, filename: string }
 *
 * Note: This endpoint uses backend wallet to sign transactions.
 * For production with user wallets, the frontend should interact directly with Sui.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Invalid content parameter' },
        { status: 400 }
      );
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Invalid filename parameter' },
        { status: 400 }
      );
    }

    // Ensure vector store is initialized
    if (!vectorStoreService.isInitialized()) {
      await vectorStoreService.initialize();
    }

    // Ingest the document
    const result = await ragService.ingestDocument(content, { filename });

    return NextResponse.json({
      success: true,
      message: 'Document ingested successfully',
      data: {
        filename,
        blobId: result.blobId,
        size: result.metadata.size,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      {
        error: 'Ingestion failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get ingestion status/history
 * GET /api/ingest
 */
export async function GET() {
  try {
    const stats = vectorStoreService.getStats();

    return NextResponse.json({
      totalDocuments: stats.totalVectors,
      registryVersion: stats.version,
      lastSync: stats.lastSync,
      status: 'ok',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get ingestion status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
