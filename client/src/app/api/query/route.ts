import { NextRequest, NextResponse } from 'next/server';
import { vectorStoreService } from '@/services/vector-store';
import { ragService } from '@/services/rag-service';

/**
 * Query the RAG system
 * POST /api/query
 * Body: { question: string, topK?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, topK = 4 } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Invalid question parameter' },
        { status: 400 }
      );
    }

    // Ensure vector store is initialized
    if (!vectorStoreService.isInitialized()) {
      await vectorStoreService.initialize();
    }

    // Check if we have any vectors
    const stats = vectorStoreService.getStats();
    if (stats.totalVectors === 0) {
      return NextResponse.json(
        {
          error: 'No documents in vector store',
          message: 'Please ingest documents first',
        },
        { status: 404 }
      );
    }

    // Perform RAG query
    const startTime = Date.now();
    const result = await ragService.query({ query: question, topK });
    const duration = Date.now() - startTime;

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources.map((source) => ({
        filename: source.filename,
        blobId: source.blobId,
        relevance: source.score,
        preview: source.content.substring(0, 200) + '...',
      })),
      metadata: {
        totalVectors: stats.totalVectors,
        registryVersion: stats.version,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      {
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
