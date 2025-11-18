import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { documentMetadataStore } from '@/services/document-metadata-store';
import { vectorStoreService } from '@/services/vector-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please login first.' },
        { status: 401 }
      );
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing required field: documentId' },
        { status: 400 }
      );
    }

    // Get document metadata to verify ownership
    const doc = await documentMetadataStore.getDocumentMetadata(user.userAddr, documentId);

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (doc.owner !== user.userAddr) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // Delete from metadata store
    await documentMetadataStore.deleteDocumentFromIndex(user.userAddr, documentId);

    // Optionally: Remove from vector store
    // This is more complex as we'd need to track which vectors belong to which document
    // For now, we'll just remove the metadata reference
    // The vectors will be cleaned up on next vector store sync

    console.log(`[Document Deleted] ${doc.filename} for user ${user.userAddr.slice(0, 10)}...`);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
