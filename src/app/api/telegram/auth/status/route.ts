/**
 * API Route: GET /api/telegram/auth/status
 * Gets authentication status and current user info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, listAuthSessions } from '@/lib/telegram';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check database for active sessions instead of just memory
    const supabase = createClient();
    const { data: activeSessions, error } = await supabase
      .from('telegram_auth')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    const connected = !error && activeSessions && activeSessions.length > 0;
    
    // Only try to get user info if we have an active session
    let user = null;
    if (connected) {
      try {
        user = await getCurrentUser();
      } catch (err) {
        console.warn('Could not get current user (client may need reconnection):', err);
      }
    }

    const sessions = await listAuthSessions();

    return NextResponse.json({
      connected,
      user: user ? {
        id: user.id.toString(),
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
        phone: user.phone,
      } : null,
      sessions: sessions.map(session => ({
        id: session.id,
        phone_number: session.phone_number,
        is_active: session.is_active,
        last_used_at: session.last_used_at,
      })),
    });
  } catch (error: any) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get authentication status' },
      { status: 500 }
    );
  }
}
