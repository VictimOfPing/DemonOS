/**
 * API Routes: /api/telegram/campaigns
 * GET - List campaigns
 * POST - Create new campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { 
  CreateCampaignRequest, 
  CreateCampaignResponse,
  RATE_LIMIT_PRESETS,
  parseMessageTemplate,
} from '@/lib/telegram/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('telegram_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ campaigns: data });
  } catch (error: any) {
    console.error('Error listing campaigns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body: CreateCampaignRequest = await request.json();
    
    const { 
      name, 
      description, 
      message_template, 
      target_filter,
      rate_limit_preset,
      rate_limit_config 
    } = body;

    // Validate input
    if (!name || !message_template) {
      return NextResponse.json(
        { error: 'Missing required fields: name, message_template' },
        { status: 400 }
      );
    }

    // Parse message template to validate
    const template = parseMessageTemplate(message_template);

    // Determine rate limit config
    let rateLimitConfig = rate_limit_config;
    if (!rateLimitConfig && rate_limit_preset) {
      rateLimitConfig = RATE_LIMIT_PRESETS[rate_limit_preset];
    }
    if (!rateLimitConfig) {
      rateLimitConfig = RATE_LIMIT_PRESETS.moderate; // Default
    }

    // Estimate target count
    const estimatedTargets = await estimateTargetCount(target_filter);

    // Create campaign
    const { data: campaign, error: createError } = await supabase
      .from('telegram_campaigns')
      .insert({
        name,
        description,
        message_template,
        target_filter,
        rate_limit_config: rateLimitConfig,
        status: 'draft',
        total_targets: estimatedTargets,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    const response: CreateCampaignResponse = {
      success: true,
      campaign,
      estimated_targets: estimatedTargets,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to estimate target count based on filters
 */
async function estimateTargetCount(filter: any): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from('scraped_data')
    .select('id', { count: 'exact', head: true })
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

  if (filter.has_username) {
    query = query.not('username', 'is', null);
  }

  if (filter.limit) {
    query = query.limit(filter.limit);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error estimating targets:', error);
    return 0;
  }

  return count || 0;
}
