/**
 * API Route: List Documents
 * Returns all documents for a user with encryption metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentMetadataStore } from '@/services/document-metadata-store';
import { SuiClient } from '@mysten/sui/client';

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';

export async function GET(request: NextRequest) {
  try {
    const userAddress = request.headers.get('x-user-address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address required' },
        { status: 401 }
      );
    }

    console.log('📋 Fetching documents for user:', userAddress);

    // Get user's document metadata
    const userIndex = await documentMetadataStore.loadUserIndex(userAddress);

    if (!userIndex || !userIndex.documents || userIndex.documents.length === 0) {
      console.log('📭 No documents found for user');
      return NextResponse.json({
        success: true,
        documents: [],
      });
    }

    console.log(`📚 Found ${userIndex.documents.length} documents`);

    // Enrich documents with access policy details if private
    const suiClient = new SuiClient({ url: SUI_RPC_URL });
    const enrichedDocuments = await Promise.all(
      userIndex.documents.map(async (doc) => {
        const isPrivate = !!doc.encryptionMetadata;
        const policyId = doc.encryptionMetadata?.accessPolicyId;

        let allowedUsers: string[] = [];
        let isPublic = !isPrivate;

        // Fetch access policy details if private
        if (policyId) {
          try {
            const policyObject = await suiClient.getObject({
              id: policyId,
              options: { showContent: true },
            });

            if (policyObject.data?.content && policyObject.data.content.dataType === 'moveObject') {
              const fields = policyObject.data.content.fields as any;
              allowedUsers = fields.allowed_users || [];
              isPublic = fields.is_public || false;
            }
          } catch (error) {
            console.warn(`⚠️  Failed to fetch policy ${policyId}:`, error);
          }
        }

        return {
          documentId: doc.documentId,
          filename: doc.filename,
          fileType: doc.fileType,
          size: doc.size,
          uploadedAt: doc.uploadedAt,
          blobId: doc.blobId,
          owner: doc.owner,
          isPrivate,
          policyId,
          allowedUsers,
          isPublic,
        };
      })
    );

    console.log('✅ Documents enriched with access policy data');

    return NextResponse.json({
      success: true,
      documents: enrichedDocuments,
    });

  } catch (error) {
    console.error('❌ Failed to list documents:', error);
    return NextResponse.json(
      {
        error: 'Failed to list documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
