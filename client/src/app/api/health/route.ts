import { NextResponse } from 'next/server';
import { config, validateConfig } from '@/config';

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET() {
  try {
    const isConfigValid = validateConfig();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      config: {
        valid: isConfigValid,
        suiNetwork: config.sui.network,
        registryConfigured: !!config.sui.vectorRegistryObjectId,
        walrusConfigured: !!config.walrus.publisherUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
