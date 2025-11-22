/**
 * API Route: Check Access
 * Check if a user has access to a private document
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient } from '@mysten/sui/client';

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const ACCESS_CONTROL_PACKAGE_ID = process.env.NEXT_PUBLIC_ACCESS_CONTROL_PACKAGE_ID ||
  '0x55931317f860d14eb60407236de81eb8519b165fffd2e851f8931a132884f95c';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const policyId = searchParams.get('policyId');
    const userAddress = searchParams.get('userAddress') || request.headers.get('x-user-address');

    if (!policyId || !userAddress) {
      return NextResponse.json(
        { error: 'Policy ID and user address required' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking access:', {
      policyId,
      userAddress,
    });

    const suiClient = new SuiClient({ url: SUI_RPC_URL });

    // Fetch the access policy object
    const policyObject = await suiClient.getObject({
      id: policyId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!policyObject.data) {
      console.error('❌ Policy not found:', policyId);
      return NextResponse.json(
        {
          hasAccess: false,
          accessType: 'denied',
          error: 'Access policy not found',
        },
        { status: 404 }
      );
    }

    const content = policyObject.data.content;
    if (!content || content.dataType !== 'moveObject') {
      return NextResponse.json(
        {
          hasAccess: false,
          accessType: 'denied',
          error: 'Invalid policy object',
        },
        { status: 500 }
      );
    }

    const fields = content.fields as any;
    const owner = fields.owner;
    const isPublic = fields.is_public;
    const allowedUsers = fields.allowed_users || [];

    console.log('📋 Policy details:', {
      owner,
      isPublic,
      allowedUsersCount: allowedUsers.length,
    });

    // Check access
    let hasAccess = false;
    let accessType: 'owner' | 'granted' | 'public' | 'denied' = 'denied';

    if (owner === userAddress) {
      hasAccess = true;
      accessType = 'owner';
      console.log('✅ Access granted: User is owner');
    } else if (isPublic) {
      hasAccess = true;
      accessType = 'public';
      console.log('✅ Access granted: Document is public');
    } else if (allowedUsers.includes(userAddress)) {
      hasAccess = true;
      accessType = 'granted';
      console.log('✅ Access granted: User in allowed list');
    } else {
      console.log('❌ Access denied:', {
        owner,
        requester: userAddress,
        isPublic,
        inAllowedList: false,
      });
    }

    return NextResponse.json({
      hasAccess,
      accessType,
      owner,
      isPublic,
      allowedUsers,
    });

  } catch (error) {
    console.error('Access check error:', error);
    return NextResponse.json(
      {
        hasAccess: false,
        accessType: 'denied',
        error: 'Failed to check access',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
