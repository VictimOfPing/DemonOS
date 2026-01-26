/**
 * API Route: POST /api/telegram/campaigns/[id]/start
 * Starts a campaign and begins sending messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { fillMessageTemplate } from '@/lib/telegram/types';
import { estimateCampaignDuration } from '@/lib/telegram/queue';

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

    // Check if already active
    if (campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Campaign is already active' },
        { status: 400 }
      );
    }

    // Load target recipients from scraped_data
    const targets = await loadCampaignTargets(campaignId, campaign.target_filter);

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'No targets found matching filters' },
        { status: 400 }
      );
    }

    // Create message records for each target
    const messageRecords = targets.map((target) => {
      const messageText = fillMessageTemplate(campaign.message_template, {
        name: target.entity_name || target.display_name || 'there',
        first_name: target.display_name || 'there',
        username: target.username || '',
      });

      return {
        campaign_id: campaignId,
        recipient_telegram_id: target.entity_id,
        recipient_username: target.username,
        recipient_name: target.entity_name,
        message_text: messageText,
        status: 'pending',
      };
    });

    // Insert messages in batches
    const batchSize = 500;
    for (let i = 0; i < messageRecords.length; i += batchSize) {
      const batch = messageRecords.slice(i, i + batchSize);
      await supabase.from('telegram_messages').insert(batch);
    }

    // Calculate estimated duration
    const { hours, completionDate } = estimateCampaignDuration(
      targets.length,
      campaign.rate_limit_config
    );

    // Update campaign status
    await supabase
      .from('telegram_campaigns')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        total_targets: targets.length,
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      message: `Campaign started with ${targets.length} targets`,
      targets_loaded: targets.length,
      estimated_duration_hours: Math.round(hours * 100) / 100,
      estimated_completion: completionDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start campaign' },
      { status: 500 }
    );
  }
}

/**
 * Loads target recipients based on campaign filters
 */
async function loadCampaignTargets(
  campaignId: string,
  filter: any
): Promise<any[]> {
  const supabase = createClient();

  // Get already contacted users for this campaign
  const { data: existingMessages } = await supabase
    .from('telegram_messages')
    .select('recipient_telegram_id')
    .eq('campaign_id', campaignId);

  const excludeIds = existingMessages?.map((m) => m.recipient_telegram_id) || [];

  let query = supabase
    .from('scraped_data')
    .select('*')
    .eq('scraper_type', 'telegram');

  // Apply filters
  if (filter.source_identifiers && filter.source_identifiers.length > 0) {
    query = query.in('source_identifier', filter.source_identifiers);
  }

  if (filter.is_premium !== undefined) {
    query = query.eq('is_premium', filter.is_premium);
  }

  if (filter.is_verified !== undefined) {
    query = query.eq('is_verified', filter.is_verified);
  }

  if (filter.is_active !== undefined) {
    query = query.eq('is_active', filter.is_active);
  }

  if (filter.is_bot !== undefined) {
    query = query.eq('is_bot', filter.is_bot);
  }

  if (filter.exclude_suspicious) {
    query = query.eq('is_suspicious', false);
  }

  // IMPORTANT: Only target users with username (required for sending messages)
  // Users without username can only be messaged if your account is in their groups
  query = query.not('username', 'is', null).not('username', 'eq', '');

  // Exclude already contacted
  if (excludeIds.length > 0) {
    query = query.not('entity_id', 'in', `(${excludeIds.join(',')})`);
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load targets: ${error.message}`);
  }

  return data || [];
}
