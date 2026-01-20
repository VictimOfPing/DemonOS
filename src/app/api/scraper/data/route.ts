/**
 * GET /api/scraper/data
 * Get scraped data from Apify dataset or Supabase (generic format)
 * 
 * POST /api/scraper/data
 * Save scraped data to generic scraped_data table
 */

import { NextRequest, NextResponse } from "next/server";
import { getRunData, getRunStatus } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import type { ApiResponse } from "@/types/scraper";
import type { ScrapedDataRow, ScrapedDataRecord, rowToRecord, ScraperType } from "@/types/scraped-data";

const logger = createLogger("api/scraper/data");

interface DataResponse {
  items: ScrapedDataRecord[];
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
    const source = searchParams.get("source") || "database";
    const scraperType = searchParams.get("scraperType");
    const sourceIdentifier = searchParams.get("sourceIdentifier");
    const entityType = searchParams.get("entityType");
    const search = searchParams.get("search");

    // Validate limit
    const safeLimit = Math.min(Math.max(limit, 1), 1000);
    const safeOffset = Math.max(offset, 0);

    // If source is database, fetch from Supabase scraped_data table
    if (source === "database") {
      const supabase = getServerSupabase();
      
      let query = supabase
        .from("scraped_data")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(safeOffset, safeOffset + safeLimit - 1);

      // Apply filters
      if (scraperType) {
        query = query.eq("scraper_type", scraperType);
      }
      if (sourceIdentifier) {
        query = query.eq("source_identifier", sourceIdentifier);
      }
      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      if (search) {
        query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%,entity_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error("Database query error", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Map database rows to frontend format
      const items: ScrapedDataRecord[] = (data || []).map((row: ScrapedDataRow) => ({
        id: row.id,
        runId: row.run_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        scraperType: row.scraper_type as ScraperType,
        scraperActor: row.scraper_actor || "",
        sourceIdentifier: row.source_identifier,
        sourceName: row.source_name,
        entityId: row.entity_id,
        entityType: row.entity_type as any,
        entityName: row.entity_name,
        data: row.data,
        username: row.username,
        displayName: row.display_name,
        profileUrl: row.profile_url,
        isVerified: row.is_verified,
        isPremium: row.is_premium,
        isBot: row.is_bot,
        isSuspicious: row.is_suspicious,
        isActive: row.is_active,
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

    // Otherwise, fetch from Apify and return raw format
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
          error: "Either runId or datasetId is required for Apify source",
        },
        { status: 400 }
      );
    }

    // Fetch data from Apify dataset
    const { items: rawItems, total, hasMore } = await getRunData(targetDatasetId, safeLimit, safeOffset);

    // Convert raw Apify items to ScrapedDataRecord format
    const items: ScrapedDataRecord[] = (rawItems as unknown as Record<string, unknown>[]).map((item, index) => ({
      id: `apify-${index}`,
      runId: runId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scraperType: "telegram" as ScraperType,
      scraperActor: "apify",
      sourceIdentifier: (item.source_url || item.group || "unknown") as string,
      sourceName: null,
      entityId: String(item.user_id || item.id || index),
      entityType: "member" as any,
      entityName: [item.first_name, item.last_name].filter(Boolean).join(" ") || null,
      data: item,
      username: (item.user_name || item.username) as string || null,
      displayName: (item.first_name) as string || null,
      profileUrl: null,
      isVerified: Boolean(item.is_verified),
      isPremium: Boolean(item.is_premium),
      isBot: item.type === "bot",
      isSuspicious: Boolean(item.is_scam || item.is_fake),
      isActive: !Boolean(item.is_deleted),
    }));

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
    logger.error("Error getting scraper data", error);
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
 * Manually save scraped data from Apify to Supabase
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ saved: number }>>> {
  try {
    const body = await request.json();
    const { runId, datasetId, scraperType = "telegram" } = body;

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

    const supabase = getServerSupabase();

    if (runId) {
      const runInfo = await getRunStatus(runId);
      targetDatasetId = runInfo.datasetId;

      // Get database run ID and actor_id
      const { data: dbRun } = await supabase
        .from("scraper_runs")
        .select("id, actor_id, input_config")
        .eq("run_id", runId)
        .single();

      dbRunId = dbRun?.id || null;
    }

    // Fetch all data from Apify (paginated)
    const allItems: Record<string, unknown>[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { items, hasMore: more } = await getRunData(targetDatasetId, batchSize, offset);
      allItems.push(...(items as unknown as Record<string, unknown>[]));
      hasMore = more;
      offset += batchSize;

      // Safety limit
      if (allItems.length > 100000) {
        logger.warn("Safety limit reached, stopping data fetch");
        break;
      }
    }

    // Get source info
    const { data: runData } = await supabase
      .from("scraper_runs")
      .select("input_config, actor_id")
      .eq("id", dbRunId)
      .single();
    
    const inputConfig = runData?.input_config as Record<string, unknown> || {};
    const actorId = runData?.actor_id || "unknown";
    const sourceIdentifier = (
      inputConfig.Target_Group || 
      inputConfig.targetGroup || 
      "unknown_source"
    ) as string;

    // Map to generic scraped_data format
    const insertData = allItems.map((item) => {
      const entityId = String(
        item.user_id || item.telegram_id || item.id || ""
      );
      
      const username = (
        item.user_name || 
        item.username || 
        (Array.isArray(item.usernames) ? item.usernames[0] : null)
      ) as string || null;

      const firstName = (item.first_name || item.firstName) as string || "";
      const lastName = (item.last_name || item.lastName) as string || "";
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || null;

      return {
        scraper_type: scraperType,
        scraper_actor: actorId,
        source_identifier: sourceIdentifier,
        source_name: sourceIdentifier,
        entity_id: entityId,
        entity_type: "member",
        entity_name: displayName,
        username: username,
        display_name: firstName || null,
        profile_url: username ? `https://t.me/${username}` : null,
        is_verified: Boolean(item.is_verified || item.verified),
        is_premium: Boolean(item.is_premium || item.premium),
        is_bot: item.type === "bot" || Boolean(item.is_bot),
        is_suspicious: Boolean(item.is_scam || item.is_fake),
        is_active: !Boolean(item.is_deleted || item.deleted),
        data: item,
      };
    });

    // Filter out items with empty entity_id
    const validData = insertData.filter(item => item.entity_id && item.entity_id !== "" && item.entity_id !== "0");

    // Insert in batches using upsert
    const BATCH_SIZE = 500;
    let savedCount = 0;

    for (let i = 0; i < validData.length; i += BATCH_SIZE) {
      const batch = validData.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("scraped_data")
        .upsert(batch, {
          onConflict: "scraper_type,source_identifier,entity_id",
          ignoreDuplicates: false,
        });

      if (error) {
        logger.error(`Batch insert error at ${i}`, error);
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

    logger.info(`Saved ${savedCount} items for run ${runId || datasetId}`);

    return NextResponse.json({
      success: true,
      data: {
        saved: savedCount,
      },
    });
  } catch (error) {
    logger.error("Error saving scraper data", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save scraper data",
      },
      { status: 500 }
    );
  }
}
