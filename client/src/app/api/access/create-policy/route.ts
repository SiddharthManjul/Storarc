/**
 * API Route: Create Access Control Policy
 * Creates a new access policy on Sui blockchain for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const ACCESS_CONTROL_PACKAGE_ID = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID ||
  '0xcd6c26bba8af6837ed38d40e761adb8f795ba65f1a15f735c8eb0cc35b2b1b40';

export async function POST(request: NextRequest) {
  try {
    const userAddr = request.headers.get('x-user-address');

    if (!userAddr) {
      return NextResponse.json(
        { error: 'User address required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documentId, isPublic = false } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      );
    }

    // Build transaction to create access policy
    const suiClient = new SuiClient({ url: SUI_RPC_URL });
    const tx = new Transaction();
    tx.setSender(userAddr);

    // Convert documentId to bytes for Sui contract
    const documentIdBytes = new TextEncoder().encode(documentId);

    tx.moveCall({
      target: `${ACCESS_CONTROL_PACKAGE_ID}::access_control::create_policy`,
      arguments: [
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(documentIdBytes))),
        tx.pure.bool(isPublic),
      ],
    });

    // Return transaction bytes for client to sign
    const txBytes = await tx.build({ client: suiClient });

    return NextResponse.json({
      success: true,
      transactionBytes: Buffer.from(txBytes).toString('base64'),
      message: 'Access policy transaction prepared. Please sign with your wallet.',
    });

  } catch (error) {
    console.error('Create policy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create access policy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Import BCS for serialization
import { bcs } from '@mysten/sui/bcs';
