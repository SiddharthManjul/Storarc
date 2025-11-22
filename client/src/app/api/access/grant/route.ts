/**
 * API Route: Grant Access
 * Grant access to a user for a private document
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const ACCESS_CONTROL_PACKAGE_ID = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID ||
  '0xcd6c26bba8af6837ed38d40e761adb8f795ba65f1a15f735c8eb0cc35b2b1b40';

export async function POST(request: NextRequest) {
  try {
    const ownerAddr = request.headers.get('x-user-address');

    if (!ownerAddr) {
      return NextResponse.json(
        { error: 'User address required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { policyId, userAddress } = body;

    if (!policyId || !userAddress) {
      return NextResponse.json(
        { error: 'Policy ID and user address required' },
        { status: 400 }
      );
    }

    // Build transaction to grant access
    const suiClient = new SuiClient({ url: SUI_RPC_URL });
    const tx = new Transaction();
    tx.setSender(ownerAddr);

    tx.moveCall({
      target: `${ACCESS_CONTROL_PACKAGE_ID}::access_control::grant_access`,
      arguments: [
        tx.object(policyId),
        tx.pure.address(userAddress),
      ],
    });

    // Return transaction bytes for client to sign
    const txBytes = await tx.build({ client: suiClient });

    return NextResponse.json({
      success: true,
      transactionBytes: Buffer.from(txBytes).toString('base64'),
      message: 'Grant access transaction prepared. Please sign with your wallet.',
    });

  } catch (error) {
    console.error('Grant access error:', error);
    return NextResponse.json(
      {
        error: 'Failed to grant access',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
