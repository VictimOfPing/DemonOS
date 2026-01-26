/**
 * API Route: POST /api/telegram/auth
 * Initializes Telegram authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeTelegramClient } from '@/lib/telegram';
import { AuthInitRequest, AuthInitResponse } from '@/lib/telegram/types';

export async function POST(request: NextRequest) {
  try {
    const body: AuthInitRequest = await request.json();
    const { phone_number } = body;

    // Get API credentials from environment variables
    const api_id = process.env.TELEGRAM_API_ID;
    const api_hash = process.env.TELEGRAM_API_HASH;

    // Validate environment variables
    if (!api_id || !api_hash) {
      return NextResponse.json(
        { error: 'Telegram API credentials not configured in environment variables. Please check your .env file.' },
        { status: 500 }
      );
    }

    // Validate input
    if (!phone_number) {
      return NextResponse.json(
        { error: 'Missing required field: phone_number' },
        { status: 400 }
      );
    }

    // Initialize client and send verification code
    const result = await initializeTelegramClient(
      phone_number,
      api_id,
      api_hash
    );

    const response: AuthInitResponse = {
      session_id: result.sessionId,
      phone_code_hash: result.phoneCodeHash,
      message: 'Verification code sent to your Telegram app. Please check and verify.',
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Auth initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize authentication' },
      { status: 500 }
    );
  }
}
