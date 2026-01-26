/**
 * API Route: POST /api/telegram/auth/verify
 * Verifies phone code and completes authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPhoneCode } from '@/lib/telegram';
import { AuthVerifyRequest, AuthVerifyResponse } from '@/lib/telegram/types';

export async function POST(request: NextRequest) {
  try {
    const body: AuthVerifyRequest = await request.json();
    const { session_id, phone_code, password } = body;

    // Validate input
    if (!session_id || !phone_code) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, phone_code' },
        { status: 400 }
      );
    }

    // Extract phone_code_hash from headers or body
    const phoneCodeHash = request.headers.get('x-phone-code-hash') || body.phone_code_hash;
    
    if (!phoneCodeHash) {
      return NextResponse.json(
        { error: 'Missing phone_code_hash' },
        { status: 400 }
      );
    }

    // Verify code
    const authId = await verifyPhoneCode(
      session_id,
      phone_code,
      phoneCodeHash,
      password
    );

    const response: AuthVerifyResponse = {
      success: true,
      auth_id: authId,
      message: 'Authentication successful',
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to verify code',
      },
      { status: 500 }
    );
  }
}
