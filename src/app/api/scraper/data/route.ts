/**
 * GET /api/scraper/data
 * Get scraped data from Apify dataset or Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getRunData, getRunStatus } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types/scraper";
import type { TelegramMember } from "@/lib/apify/types";

interface DataResponse {
  items: TelegramMember[];
  total: number;
  hasMore: boolean;
  source: "apify" | "database";
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DataResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get("runId");
    const datasetId = searchParams.get("datasetId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const source = searchParams.get("source") || "apify"; // apify or database
    const sourceUrl = searchParams.get("sourceUrl"); // Filter by source_url

    // Validate limit
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    const safeOffset = Math.max(offset, 0);

    // If source is database, fetch from Supabase
    if (source === "database") {
      const supabase = getServerSupabase();
      
      let query = supabase
        .from("telegram_members")
        .select("*", { count: "exact" })
        .order("processed_at", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);

      if (sourceUrl) {
        query = query.eq("source_url", sourceUrl);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Map database rows to TelegramMember format
      const items: TelegramMember[] = (data || []).map((row) => ({
        source_url: row.source_url,
        processor: row.processor || "",
        processed_at: row.processed_at || row.created_at,
        id: row.telegram_id,
        first_name: row.first_name,
        last_name: row.last_name,
        usernames: row.usernames || [],
        phone: row.phone,
        type: row.type || "user",
        is_deleted: row.is_deleted || false,
        is_verified: row.is_verified || false,
        is_premium: row.is_premium || false,
        is_scam: row.is_scam || false,
        is_fake: row.is_fake || false,
        is_restricted: row.is_restricted || false,
        lang_code: row.lang_code,
        last_seen: row.last_seen,
        stories_hidden: row.stories_hidden || false,
        premium_contact: row.premium_contact || false,
      }));

      return NextResponse.json({
        success: true,
        data: {
          items,
          total: count || 0,
          hasMore: (count || 0) > safeOffset + safeLimit,
          source: "database",
        },
      });
    }

    // Otherwise, fetch from Apify
    let targetDatasetId = datasetId;

    // If runId is provided but not datasetId, get datasetId from run info
    if (runId && !targetDatasetId) {
      const runInfo = await getRunStatus(runId);
      targetDatasetId = runInfo.datasetId;
    }

    if (!targetDatasetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either runId or datasetId is required",
        },
        { status: 400 }
      );
    }

    // Fetch data from Apify dataset
    const { items, total, hasMore } = await getRunData(targetDatasetId, safeLimit, safeOffset);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        hasMore,
        source: "apify",
      },
    });
  } catch (error) {
    console.error("Error getting scraper data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get scraper data",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scraper/data
 * Save scraped data from Apify to Supabase
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ saved: number }>>> {
  try {
    const body = await request.json();
    const { runId, datasetId } = body;

    if (!runId && !datasetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either runId or datasetId is required",
        },
        { status: 400 }
      );
    }

    // Get dataset ID from run if not provided
    let targetDatasetId = datasetId;
    let dbRunId: string | null = null;

    if (runId) {
      const runInfo = await getRunStatus(runId);
      targetDatasetId = runInfo.datasetId;

      // Get database run ID
      const supabase = getServerSupabase();
      const { data: dbRun } = await supabase
        .from("scraper_runs")
        .select("id")
        .eq("run_id", runId)
        .single();

      dbRunId = dbRun?.id || null;
    }

    // Fetch all data from Apify (paginated)
    const allItems: TelegramMember[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { items, hasMore: more } = await getRunData(targetDatasetId, batchSize, offset);
      allItems.push(...items);
      hasMore = more;
      offset += batchSize;

      // Safety limit
      if (allItems.length > 100000) {
        console.warn("Safety limit reached, stopping data fetch");
        break;
      }
    }

    // Save to Supabase - map to database schema
    const supabase = getServerSupabase();
    const insertData = allItems.map((item) => ({
      run_id: dbRunId,
      source_url: item.source_url,
      processor: item.processor,
      processed_at: item.processed_at,
      telegram_id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      usernames: item.usernames,
      phone: item.phone,
      type: item.type,
      is_deleted: item.is_deleted,
      is_verified: item.is_verified,
      is_premium: item.is_premium,
      is_scam: item.is_scam,
      is_fake: item.is_fake,
      is_restricted: item.is_restricted,
      lang_code: item.lang_code,
      last_seen: item.last_seen,
      stories_hidden: item.stories_hidden,
      premium_contact: item.premium_contact,
    }));

    // Insert in batches to avoid payload limits
    const BATCH_SIZE = 500;
    let savedCount = 0;

    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("telegram_members")
        .upsert(batch, {
          onConflict: "telegram_id,source_url",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
      } else {
        savedCount += batch.length;
      }
    }

    // Update run with final count
    if (dbRunId) {
      await supabase
        .from("scraper_runs")
        .update({ items_count: savedCount })
        .eq("id", dbRunId);
    }

    return NextResponse.json({
      success: true,
      data: {
        saved: savedCount,
      },
    });
  } catch (error) {
    console.error("Error saving scraper data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save scraper data",
      },
      { status: 500 }
    );
  }
}
