/**
 * GET /api/scraper/data
 * Get scraped data from Apify dataset or Supabase (generic format)
 * 
 * POST /api/scraper/data
 * Save scraped data to generic scraped_data table
 */

import { NextRequest, NextResponse } from "next/server";
import { getRunData, getRunStatus } from "@/lib/apify/telegram-actor";
import { getFacebookRunData, getFacebookRunDataRaw } from "@/lib/apify/facebook-actor";
import { getInstagramRunDataRaw } from "@/lib/apify/instagram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import { ACTOR_IDS } from "@/lib/apify/client";
import type { ApiResponse } from "@/types/scraper";
import type { ScrapedDataRow, ScrapedDataRecord, ScraperType } from "@/types/scraped-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const logger = createLogger("api/scraper/data");

interface DataResponse {
  items: ScrapedDataRecord[];
  total: number;
  hasMore: boolean;
  source: "apify" | "database";
}

/**
 * Determine scraper type from actor ID
 */
function getScraperTypeFromActorId(actorId: string): ScraperType {
  if (actorId === ACTOR_IDS.TELEGRAM_GROUP_MEMBER) {
    return "telegram";
  }
  if (actorId === ACTOR_IDS.FACEBOOK_GROUP_MEMBER) {
    return "facebook";
  }
  if (actorId === ACTOR_IDS.INSTAGRAM_FOLLOWERS) {
    return "instagram";
  }
  return "custom";
}

/**
 * Transform Facebook raw item to ScrapedDataRecord
 */
function transformFacebookItem(
  item: Record<string, unknown>,
  index: number,
  runId: string | null
): ScrapedDataRecord {
  const member = item.member as Record<string, unknown> | undefined;
  const groupInfo = member?.groupInfo as Record<string, unknown> | undefined;

  return {
    id: `apify-fb-${index}`,
    runId: runId,
    createdAt: (item.scrapedAt as string) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scraperType: "facebook" as ScraperType,
    scraperActor: ACTOR_IDS.FACEBOOK_GROUP_MEMBER,
    sourceIdentifier: (item.groupUrl as string) || "unknown",
    sourceName: null,
    entityId: String(member?.id || index),
    entityType: "member",
    entityName: (member?.name as string) || null,
    data: item,
    username: null, // Facebook doesn't expose usernames in this API
    displayName: (member?.name as string) || null,
    profileUrl: (member?.profileUrl as string) || null,
    isVerified: Boolean(member?.isVerified),
    isPremium: false, // Facebook doesn't have premium
    isBot: false,
    isSuspicious: false,
    isActive: true,
  };
}

/**
 * Transform Telegram raw item to ScrapedDataRecord
 */
function transformTelegramItem(
  item: Record<string, unknown>,
  index: number,
  runId: string | null
): ScrapedDataRecord {
  return {
    id: `apify-tg-${index}`,
    runId: runId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scraperType: "telegram" as ScraperType,
    scraperActor: ACTOR_IDS.TELEGRAM_GROUP_MEMBER,
    sourceIdentifier: (item.source_url || item.group || "unknown") as string,
    sourceName: null,
    entityId: String(item.user_id || item.id || index),
    entityType: "member",
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
  };
}

/**
 * Transform Instagram raw item to ScrapedDataRecord
 * Supports new scraping_solutions format with username_scrape and type fields
 */
function transformInstagramItem(
  item: Record<string, unknown>,
  index: number,
  runId: string | null,
  sourceUsername?: string
): ScrapedDataRecord {
  // New scraper format includes username_scrape (the target account)
  const scrapeTarget = (item.username_scrape as string) || sourceUsername || "unknown";
  const scrapeType = (item.type as string) || "Followers";

  return {
    id: `apify-ig-${index}`,
    runId: runId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scraperType: "instagram" as ScraperType,
    scraperActor: ACTOR_IDS.INSTAGRAM_FOLLOWERS,
    sourceIdentifier: scrapeTarget,
    sourceName: scrapeType,
    entityId: String(item.id || index),
    entityType: "member",
    entityName: (item.full_name as string) || null,
    data: {
      ...item,
      _scrapeTarget: scrapeTarget,
      _scrapeType: scrapeType,
    },
    username: (item.username as string) || null,
    displayName: (item.full_name as string) || null,
    profileUrl: item.username ? `https://instagram.com/${item.username}` : null,
    isVerified: Boolean(item.is_verified),
    isPremium: false, // Instagram doesn't have premium in this context
    isBot: false,
    isSuspicious: false,
    isActive: !Boolean(item.is_private), // Use private status as proxy for active
  };
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
        entityType: row.entity_type as "member",
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

    // Otherwise, fetch from Apify and return transformed format
    let targetDatasetId = datasetId;
    let detectedScraperType: ScraperType = (scraperType as ScraperType) || "telegram";

    // If runId is provided but not datasetId, get datasetId from run info
    if (runId && !targetDatasetId) {
      const runInfo = await getRunStatus(runId);
      targetDatasetId = runInfo.datasetId;
      detectedScraperType = getScraperTypeFromActorId(runInfo.actorId);
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

    // Fetch data from Apify dataset based on scraper type
    let rawItems: Record<string, unknown>[];
    let total: number;
    let hasMore: boolean;

    if (detectedScraperType === "facebook") {
      const result = await getFacebookRunDataRaw(targetDatasetId, safeLimit, safeOffset);
      rawItems = result.items;
      total = result.total;
      hasMore = result.hasMore;
    } else if (detectedScraperType === "instagram") {
      const result = await getInstagramRunDataRaw(targetDatasetId, safeLimit, safeOffset);
      rawItems = result.items;
      total = result.total;
      hasMore = result.hasMore;
    } else {
      const result = await getRunData(targetDatasetId, safeLimit, safeOffset);
      rawItems = result.items as unknown as Record<string, unknown>[];
      total = result.total;
      hasMore = result.hasMore;
    }

    // Transform items based on scraper type
    const items: ScrapedDataRecord[] = rawItems.map((item, index) => {
      if (detectedScraperType === "facebook") {
        return transformFacebookItem(item, index, runId);
      }
      if (detectedScraperType === "instagram") {
        return transformInstagramItem(item, index, runId);
      }
      return transformTelegramItem(item, index, runId);
    });

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

    const supabase = getServerSupabase();

    // Get run info to determine scraper type
    let actorId = "unknown";
    let inputConfig: Record<string, unknown> = {};

    if (runId) {
      const runInfo = await getRunStatus(runId);
      targetDatasetId = runInfo.datasetId;
      actorId = runInfo.actorId;

      // Get database run ID and actor_id
      const { data: dbRun } = await supabase
        .from("scraper_runs")
        .select("id, actor_id, input_config")
        .eq("run_id", runId)
        .single();

      dbRunId = dbRun?.id || null;
      if (dbRun?.actor_id) actorId = dbRun.actor_id;
      if (dbRun?.input_config) inputConfig = dbRun.input_config as Record<string, unknown>;
    }

    const scraperType = getScraperTypeFromActorId(actorId);

    // Fetch all data from Apify (paginated)
    const allItems: Record<string, unknown>[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let result: { items: Record<string, unknown>[]; hasMore: boolean };
      
      if (scraperType === "facebook") {
        result = await getFacebookRunDataRaw(targetDatasetId, batchSize, offset);
      } else if (scraperType === "instagram") {
        result = await getInstagramRunDataRaw(targetDatasetId, batchSize, offset);
      } else {
        const tgResult = await getRunData(targetDatasetId, batchSize, offset);
        result = {
          items: tgResult.items as unknown as Record<string, unknown>[],
          hasMore: tgResult.hasMore,
        };
      }
      
      allItems.push(...result.items);
      hasMore = result.hasMore;
      offset += batchSize;

      // Safety limit
      if (allItems.length > 100000) {
        logger.warn("Safety limit reached, stopping data fetch");
        break;
      }
    }

    // Map to generic scraped_data format based on scraper type
    const insertData = allItems.map((item) => {
      if (scraperType === "facebook") {
        return transformFacebookItemForInsert(item, actorId, inputConfig);
      }
      if (scraperType === "instagram") {
        return transformInstagramItemForInsert(item, actorId, inputConfig);
      }
      return transformTelegramItemForInsert(item, actorId, inputConfig);
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

    logger.info(`Saved ${savedCount} ${scraperType} items for run ${runId || datasetId}`);

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

/**
 * Transform Facebook item for database insert
 */
function transformFacebookItemForInsert(
  item: Record<string, unknown>,
  actorId: string,
  inputConfig: Record<string, unknown>
) {
  const member = item.member as Record<string, unknown> | undefined;
  const groupInfo = member?.groupInfo as Record<string, unknown> | undefined;
  const groupUrl = (item.groupUrl as string) || "";
  
  // Extract group identifier from URL for source_identifier
  const sourceIdentifier = groupUrl || 
    (Array.isArray(inputConfig.groupUrls) ? inputConfig.groupUrls[0] : "unknown_facebook_group");

  const entityId = String(member?.id || "");
  const displayName = (member?.name as string) || null;
  const profileUrl = (member?.profileUrl as string) || null;

  return {
    scraper_type: "facebook",
    scraper_actor: actorId,
    source_identifier: sourceIdentifier,
    source_name: sourceIdentifier,
    entity_id: entityId,
    entity_type: "member",
    entity_name: displayName,
    username: null, // Facebook doesn't expose usernames
    display_name: displayName,
    profile_url: profileUrl,
    is_verified: Boolean(member?.isVerified),
    is_premium: false,
    is_bot: false,
    is_suspicious: false,
    is_active: true,
    data: item,
  };
}

/**
 * Transform Telegram item for database insert
 */
function transformTelegramItemForInsert(
  item: Record<string, unknown>,
  actorId: string,
  inputConfig: Record<string, unknown>
) {
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

  const sourceIdentifier = (
    inputConfig.Target_Group || 
    inputConfig.targetGroup || 
    item.source_url ||
    "unknown_telegram_group"
  ) as string;

  return {
    scraper_type: "telegram",
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
}

/**
 * Transform Instagram item for database insert
 * Supports new scraping_solutions format with username_scrape and type fields
 */
function transformInstagramItemForInsert(
  item: Record<string, unknown>,
  actorId: string,
  inputConfig: Record<string, unknown>
) {
  const entityId = String(item.id || "");
  const username = (item.username as string) || null;
  const fullName = (item.full_name as string) || null;

  // New scraper format: get source from item.username_scrape or fallback to input config
  const scrapeTarget = (item.username_scrape as string) || 
    (inputConfig.Account as string[] | undefined)?.[0] || 
    "unknown_instagram_user";
  const scrapeType = (item.type as string) || 
    (inputConfig.dataToScrape as string) || 
    "Followers";

  return {
    scraper_type: "instagram",
    scraper_actor: actorId,
    source_identifier: scrapeTarget,
    source_name: scrapeType,
    entity_id: entityId,
    entity_type: "member",
    entity_name: fullName,
    username: username,
    display_name: fullName,
    profile_url: username ? `https://instagram.com/${username}` : null,
    is_verified: Boolean(item.is_verified),
    is_premium: false, // Instagram doesn't have premium in this context
    is_bot: false,
    is_suspicious: false,
    is_active: !Boolean(item.is_private),
    data: {
      ...item,
      _scrapeTarget: scrapeTarget,
      _scrapeType: scrapeType,
    },
  };
}
