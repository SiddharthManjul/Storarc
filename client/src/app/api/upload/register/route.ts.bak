/**
 * API endpoint for building document registration transaction
 * User will sign this transaction to register their document on-chain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { documentUploadService } from '@/services/document-upload-service';

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

    // Parse request body
    const body = await request.json();
    const { filename, fileType, fileSize, walrusBlobId } = body;

    if (!filename || !fileSize || !walrusBlobId) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, fileSize, walrusBlobId' },
        { status: 400 }
      );
    }

    // Check if user has a document registry
    let registryId = await documentUploadService.getUserRegistry(user.userAddr);

    // If no registry exists, create one first
    if (!registryId) {
      const createTx = await documentUploadService.createRegistryTransaction(
        user.userAddr
      );

      // Return transaction for registry creation
      return NextResponse.json({
        success: true,
        needsRegistry: true,
        message: 'User needs to create a document registry first',
        transaction: createTx.serialize(),
        transactionType: 'create_registry',
      });
    }

    // Create a temporary File object for hash calculation
    // Note: In production, you might want to send the file hash from the client
    // to avoid re-uploading the file
    const fileBlob = new Blob([new Uint8Array(fileSize)], { type: fileType });
    const file = new File([fileBlob], filename, { type: fileType });

    // Build document registration transaction
    const result = await documentUploadService.buildDocumentRegistrationTransaction({
      file,
      userAddr: user.userAddr,
      walrusBlobId,
      registryId,
    });

    // Check balance
    const balanceCheck = await documentUploadService.checkBalance(
      user.userAddr,
      result.estimatedGas
    );

    if (!balanceCheck.hasBalance) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          balance: balanceCheck.balance,
          required: balanceCheck.required,
          estimatedGas: result.estimatedGas,
        },
        { status: 402 } // Payment Required
      );
    }

    // Return transaction for signing
    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      transaction: result.transaction.serialize(),
      transactionType: 'register_document',
      estimatedGas: result.estimatedGas,
      balance: balanceCheck.balance,
      fileHash: Array.from(result.fileHash),
    });
  } catch (error: any) {
    console.error('Failed to build registration transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to build registration transaction',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
