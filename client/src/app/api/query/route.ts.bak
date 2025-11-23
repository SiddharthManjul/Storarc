import { NextRequest, NextResponse } from 'next/server';
import { vectorStoreService } from '@/services/vector-store';
import { ragService } from '@/services/rag-service';
import { documentMetadataStore } from '@/services/document-metadata-store';
import { SuiClient } from '@mysten/sui/client';

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';

/**
 * Check if user has access to a document
 */
async function checkDocumentAccess(
  blobId: string,
  userAddress: string,
  ownerAddress?: string
): Promise<boolean> {
  console.log(`\n🔐 Checking access for blob: ${blobId.substring(0, 12)}...`);
  console.log(`   Requester: ${userAddress.substring(0, 12)}...`);
  console.log(`   Owner: ${ownerAddress?.substring(0, 12) || 'unknown'}...`);

  try {
    // Try to find the document in the owner's metadata (if owner provided)
    // Otherwise search in the querying user's metadata
    const searchAddress = ownerAddress || userAddress;
    console.log(`   Searching in ${searchAddress.substring(0, 12)}...'s metadata`);

    const userIndex = await documentMetadataStore.loadUserIndex(searchAddress);
    console.log(`   Found ${userIndex?.documents?.length || 0} documents in index`);

    // Find document by blobId
    const doc = userIndex?.documents.find(d => d.blobId === blobId);

    if (!doc) {
      console.log(`   ⚠️  Document not found in metadata - treating as PUBLIC`);
      return true;
    }

    console.log(`   Found document: ${doc.filename}`);
    console.log(`   Has encryption metadata: ${!!doc.encryptionMetadata}`);

    // If no encryption metadata, it's a public document
    if (!doc.encryptionMetadata) {
      console.log(`   ✅ PUBLIC document - allowing access`);
      return true;
    }

    const policyId = doc.encryptionMetadata.accessPolicyId;
    if (!policyId) {
      console.log(`   ⚠️  PRIVATE document but no policy ID - allowing access (shouldn't happen)`);
      return true;
    }

    console.log(`   Policy ID: ${policyId.substring(0, 12)}...`);
    console.log(`   Fetching policy from Sui blockchain...`);

    // Fetch the access policy from Sui
    const suiClient = new SuiClient({ url: SUI_RPC_URL });
    const policyObject = await suiClient.getObject({
      id: policyId,
      options: { showContent: true },
    });

    if (!policyObject.data?.content || policyObject.data.content.dataType !== 'moveObject') {
      console.warn(`⚠️  Could not fetch policy ${policyId} - denying access`);
      return false;
    }

    const fields = policyObject.data.content.fields as any;
    const owner = fields.owner;
    const isPublic = fields.is_public;
    const allowedUsers = fields.allowed_users || [];

    console.log(`   Policy owner: ${owner.substring(0, 12)}...`);
    console.log(`   Policy isPublic: ${isPublic}`);
    console.log(`   Allowed users: ${allowedUsers.length} user(s)`);

    // Check access
    if (owner === userAddress) {
      console.log(`   ✅ GRANTED: Requester is owner`);
      return true;
    }
    if (isPublic) {
      console.log(`   ✅ GRANTED: Policy is public`);
      return true;
    }
    if (allowedUsers.includes(userAddress)) {
      console.log(`   ✅ GRANTED: Requester in allowed list`);
      return true;
    }

    console.log(`   ❌ DENIED: Not owner, not public, not in allowed list`);
    return false;
  } catch (error) {
    console.error(`Error checking access for ${blobId}:`, error);
    return false;
  }
}

/**
 * Query the RAG system with access control
 * POST /api/query
 * Body: { question: string, topK?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const userAddress = request.headers.get('x-user-address');
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address required' },
        { status: 401 }
      );
    }

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

    // Step 1: Search for relevant sources (no LLM yet - fast!)
    const startTime = Date.now();
    console.log(`\n🔍 Step 1: Searching for relevant sources...`);
    const sources = await ragService.searchSources(question, topK);

    console.log(`   Found ${sources.length} potential sources\n`);

    // Step 2: Filter sources by access control BEFORE generating answer
    console.log(`🔐 Step 2: Checking access control...`);
    const accessibleSources = [];
    const deniedSources = [];

    for (const source of sources) {
      const ownerAddress = source.metadata?.owner;

      const hasAccess = await checkDocumentAccess(source.blobId, userAddress, ownerAddress);

      if (hasAccess) {
        accessibleSources.push(source);
      } else {
        deniedSources.push(source);
      }
    }

    console.log(`\n📊 Access control results:`, {
      total: sources.length,
      accessible: accessibleSources.length,
      denied: deniedSources.length,
    });

    // If no accessible sources, return error immediately (no LLM call!)
    if (accessibleSources.length === 0) {
      console.log(`\n❌ No accessible documents - skipping LLM generation`);
      return NextResponse.json(
        {
          error: 'No accessible documents',
          message: 'You do not have access to any documents that could answer this question. The documents may be private or you may need to request access from the owner.',
          deniedCount: deniedSources.length,
        },
        { status: 403 }
      );
    }

    // Step 3: Generate answer ONLY from accessible sources
    console.log(`\n💡 Step 3: Generating answer from ${accessibleSources.length} accessible source(s)...`);
    const result = await ragService.generateAnswerFromSources(question, accessibleSources);

    const duration = Date.now() - startTime;

    console.log(`\n✅ Query completed in ${duration}ms`);
    console.log(`   Denied sources: ${deniedSources.length}`);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources.map((source) => ({
        filename: source.filename,
        blobId: source.blobId,
        relevance: source.score || 1.0,
        preview: source.content?.substring(0, 200) + '...' || '',
      })),
      metadata: {
        totalVectors: stats.totalVectors,
        registryVersion: stats.version,
        duration,
        timestamp: new Date().toISOString(),
        accessControl: {
          totalSources: result.sources.length,
          accessibleSources: accessibleSources.length,
          deniedSources: deniedSources.length,
        },
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
