/**
 * API Routes: /api/telegram/campaigns/[id]
 * GET - Get campaign details
 * PATCH - Update campaign
 * DELETE - Delete campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;

    const { data: campaign, error } = await supabase
      .from('telegram_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error getting campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;
    const updates = await request.json();

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.created_at;
    delete updates.messages_sent;
    delete updates.messages_failed;
    delete updates.messages_pending;
    delete updates.responses_received;

    const { data: campaign, error } = await supabase
      .from('telegram_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Check if campaign can be deleted (not active)
    const { data: campaign } = await supabase
      .from('telegram_campaigns')
      .select('status')
      .eq('id', id)
      .single();

    if (campaign?.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active campaign. Please pause it first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('telegram_campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
