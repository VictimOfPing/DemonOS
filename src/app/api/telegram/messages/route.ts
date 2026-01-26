/**
 * API Route: GET /api/telegram/messages
 * Lists messages for a campaign with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const campaignId = searchParams.get('campaign_id');
    const status = searchParams.get('status');
    const hasResponse = searchParams.get('has_response');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaign_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('telegram_messages_with_responses')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (hasResponse === 'true') {
      query = query.eq('has_response', true);
    } else if (hasResponse === 'false') {
      query = query.eq('has_response', false);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get messages' },
      { status: 500 }
    );
  }
}
