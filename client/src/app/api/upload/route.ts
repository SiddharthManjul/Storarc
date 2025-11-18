import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { documentLoader } from '@/services/document-loader';
import { ragService } from '@/services/rag-service';
import { vectorStoreService } from '@/services/vector-store';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { documentMetadataStore } from '@/services/document-metadata-store';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!documentLoader.isSupported(file.name)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported formats: ${documentLoader.getSupportedExtensions().join(', ')}`
        },
        { status: 400 }
      );
    }

    // Convert file to buffer and save temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a temporary file path
    const tempDir = join(process.cwd(), 'temp');
    const tempFilePath = join(tempDir, file.name);

    // Ensure temp directory exists
    try {
      const { existsSync, mkdirSync } = await import('fs');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }

    try {
      // Write file temporarily
      await writeFile(tempFilePath, buffer);

      // Load document using document loader
      const { content, metadata } = await documentLoader.loadDocument(tempFilePath);

      // Initialize vector store if needed
      if (!vectorStoreService.isInitialized()) {
        await vectorStoreService.initialize();
      }

      // Ingest document
      const result = await ragService.ingestDocument(content, {
        filename: metadata.filename,
        fileType: metadata.fileType,
      });

      // Clean up temporary file
      await unlink(tempFilePath);

      // Store document metadata for persistence
      const documentId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Calculate chunk count from document length
      const chunkSize = 1000;
      const estimatedChunks = Math.ceil(content.length / chunkSize);

      await documentMetadataStore.addDocumentToIndex(user.userAddr, {
        documentId,
        filename: result.filename,
        fileType: metadata.fileType,
        size: result.metadata.size,
        pageCount: metadata.pageCount,
        blobId: result.blobId,
        uploadedAt: Date.now(),
        lastAccessed: Date.now(),
        chunkCount: estimatedChunks,
        owner: user.userAddr,
      });

      console.log(`[Document Stored] ${result.filename} for user ${user.userAddr.slice(0, 10)}...`);

      return NextResponse.json({
        success: true,
        documentId,
        blobId: result.blobId,
        filename: result.filename,
        fileType: metadata.fileType,
        size: result.metadata.size,
        pageCount: metadata.pageCount,
        message: 'File uploaded and ingested successfully',
      });

    } catch (error) {
      // Clean up temporary file on error
      try {
        await unlink(tempFilePath);
      } catch (unlinkError) {
        console.error('Failed to clean up temporary file:', unlinkError);
      }

      throw error;
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
