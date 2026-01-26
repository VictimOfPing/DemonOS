/**
 * API Route: GET /api/telegram/campaigns/[id]/stats
 * Gets detailed statistics for a campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { CampaignStatsResponse } from '@/lib/telegram/types';

export async function GET(
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

    // Get messages stats
    const { data: messages } = await supabase
      .from('telegram_messages')
      .select('status, error_type, sent_at')
      .eq('campaign_id', campaignId);

    // Calculate stats
    const stats = {
      total_targets: campaign.total_targets,
      messages_sent: campaign.messages_sent,
      messages_pending: campaign.messages_pending,
      messages_failed: campaign.messages_failed,
      responses_received: campaign.responses_received,
      response_rate: campaign.messages_sent > 0 
        ? (campaign.responses_received / campaign.messages_sent) * 100 
        : 0,
      avg_send_time: calculateAvgSendTime(messages || []),
      errors_by_type: countErrorsByType(messages || []),
    };

    // Get recent messages
    const { data: recentMessages } = await supabase
      .from('telegram_messages')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get recent responses
    const { data: recentResponses } = await supabase
      .from('telegram_responses')
      .select(`
        *,
        telegram_messages!inner(campaign_id)
      `)
      .eq('telegram_messages.campaign_id', campaignId)
      .order('received_at', { ascending: false })
      .limit(50);

    const response: CampaignStatsResponse = {
      campaign,
      stats,
      recent_messages: recentMessages || [],
      recent_responses: recentResponses || [],
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error getting campaign stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get campaign stats' },
      { status: 500 }
    );
  }
}

function calculateAvgSendTime(messages: any[]): number {
  const sentMessages = messages.filter((m) => m.sent_at);
  if (sentMessages.length === 0) return 0;

  const times = sentMessages.map((m) => {
    const created = new Date(m.created_at || 0).getTime();
    const sent = new Date(m.sent_at).getTime();
    return (sent - created) / 1000; // seconds
  });

  return times.reduce((a, b) => a + b, 0) / times.length;
}

function countErrorsByType(messages: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  messages.forEach((m) => {
    if (m.error_type) {
      counts[m.error_type] = (counts[m.error_type] || 0) + 1;
    }
  });

  return counts;
}
