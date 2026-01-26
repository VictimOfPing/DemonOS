/**
 * API Route: POST /api/telegram/campaigns/[id]/resume
 * Resumes a paused campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { resumeQueue } from '@/lib/telegram/queue';

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

    // Check if paused
    if (campaign.status !== 'paused') {
      return NextResponse.json(
        { error: 'Campaign is not paused' },
        { status: 400 }
      );
    }

    // Resume the queue
    resumeQueue(campaignId);

    // Update campaign status
    await supabase
      .from('telegram_campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign resumed',
    });
  } catch (error: any) {
    console.error('Error resuming campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume campaign' },
      { status: 500 }
    );
  }
}
