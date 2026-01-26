/**
 * API Route: POST /api/telegram/campaigns/[id]/pause
 * Pauses an active campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { pauseQueue } from '@/lib/telegram/queue';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { id: campaignId } = params;

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('telegram_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if active
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Pause the queue
    pauseQueue(campaignId);

    // Update campaign status
    await supabase
      .from('telegram_campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign paused',
    });
  } catch (error: any) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}
