/**
 * Scraper Monitor Service
 * Monitors active scraper runs and handles state changes
 */

import { getRunStatus, getRunData, getRunDataRaw } from "@/lib/apify/telegram-actor";
import { getServerSupabase } from "@/lib/supabase/client";
import { createLogger } from "@/lib/supabase/logger";
import type { ApifyRunStatus } from "@/lib/apify/types";
import type { ScraperRunStatus } from "@/lib/supabase/types";

const logger = createLogger("scraper-monitor");

/** Map Apify status to database status */
function mapApifyToDbStatus(apifyStatus: ApifyRunStatus): ScraperRunStatus {
  switch (apifyStatus) {
    case "READY":
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "TIMED-OUT":
    case "TIMING-OUT":
      return "timed_out";
    case "ABORTING":
    case "ABORTED":
      return "aborted";
    default:
      return "pending";
  }
}

/** Check if status indicates run is finished */
function isFinishedStatus(status: ApifyRunStatus): boolean {
  return ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(status);
}

/** Run info returned by monitor */
export interface MonitoredRun {
  id: string;
  runId: string;
  actorId: string;
  status: ScraperRunStatus;
  apifyStatus: ApifyRunStatus;
  itemsCount: number;
  datasetId: string;
  isFinished: boolean;
  wasUpdated: boolean;
  dataSaved: boolean;
  error?: string;
}

/**
 * Check and update status of a single run
 */
export async function checkRunStatus(runId: string): Promise<MonitoredRun | null> {
  const supabase = getServerSupabase();
  
  try {
    // Get run info from Apify
    const apifyRun = await getRunStatus(runId);
    
    // Get database record
    const { data: dbRun } = await supabase
      .from("scraper_runs")
      .select("*")
      .eq("run_id", runId)
      .single();

    if (!dbRun) {
      logger.warn(`Run ${runId} not found in database`);
      return null;
    }

    const newDbStatus = mapApifyToDbStatus(apifyRun.status as ApifyRunStatus);
    const isFinished = isFinishedStatus(apifyRun.status as ApifyRunStatus);
    const statusChanged = dbRun.status !== newDbStatus;

    // Update database if status changed
    if (statusChanged || dbRun.items_count !== apifyRun.itemsCount) {
      await supabase
        .from("scraper_runs")
        .update({
          status: newDbStatus,
          items_count: apifyRun.itemsCount,
          duration_ms: apifyRun.durationMs,
          finished_at: apifyRun.finishedAt,
          error_message: apifyRun.errorMessage,
        })
        .eq("run_id", runId);

      if (statusChanged) {
        logger.info(`Run ${runId} status changed: ${dbRun.status} -> ${newDbStatus}`);
      }
    }

    return {
      id: dbRun.id,
      runId: runId,
      actorId: apifyRun.actorId,
      status: newDbStatus,
      apifyStatus: apifyRun.status as ApifyRunStatus,
      itemsCount: apifyRun.itemsCount,
      datasetId: apifyRun.datasetId,
      isFinished,
      wasUpdated: statusChanged,
      dataSaved: false,
    };
  } catch (error) {
    logger.error(`Failed to check run ${runId}`, error);
    return null;
  }
}

/** Result of auto-save operation with detailed error info */
export interface AutoSaveResult {
  savedCount: number;
  totalItems: number;
  validItems: number;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
}

/**
 * Auto-save data for a completed run
 * Uses generic scraped_data table that supports any scraper type
 */
export async function autoSaveRunData(
  dbRunId: string,
  datasetId: string,
  scraperType: string = "telegram"
): Promise<AutoSaveResult> {
  const supabase = getServerSupabase();
  
  try {
    // Check if we have service role key
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hasServiceKey) {
      logger.warn("SUPABASE_SERVICE_ROLE_KEY not configured - using anon key, inserts may fail due to RLS");
    }

    // Fetch all RAW data from Apify (to preserve original field names like user_id)
    let allItems: Record<string, unknown>[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { items, hasMore: more } = await getRunDataRaw(datasetId, batchSize, offset);
      allItems = allItems.concat(items);
      hasMore = more;
      offset += batchSize;

      // Safety limit
      if (allItems.length > 50000) {
        logger.warn("Auto-save safety limit reached");
        break;
      }
    }

    if (allItems.length === 0) {
      return { savedCount: 0, totalItems: 0, validItems: 0 };
    }

    // Log first item to debug structure
    logger.info(`Sample item structure: ${JSON.stringify(allItems[0], null, 2)}`);

    // Get the source info from the run's input config in database
    const { data: runData, error: runError } = await supabase
      .from("scraper_runs")
      .select("input_config, actor_id")
      .eq("id", dbRunId)
      .single();
    
    if (runError) {
      logger.error(`Failed to get run config: ${runError.message}`);
    }
    
    const inputConfig = runData?.input_config as Record<string, unknown> || {};
    const actorId = runData?.actor_id || "unknown";
    const sourceIdentifier = (
      inputConfig.Target_Group || 
      inputConfig.targetGroup || 
      inputConfig.target_url ||
      inputConfig.username ||
      "unknown_source"
    ) as string;

    // Map to generic scraped_data format
    const insertData = allItems.map((item) => {
      // Extract entity ID
      const entityId = String(
        item.user_id || item.telegram_id || item.id || item.userId || item.entity_id || ""
      );
      
      // Get username
      const username = (
        item.user_name || 
        item.username || 
        (Array.isArray(item.usernames) ? item.usernames[0] : null)
      ) as string || null;

      // Get display name
      const firstName = (item.first_name || item.firstName || item.name) as string || "";
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
        is_suspicious: Boolean(item.is_scam || item.is_fake || item.scam || item.fake),
        is_active: !Boolean(item.is_deleted || item.deleted),
        // Store all original data in JSONB
        data: item,
      };
    });

    // Filter out items with empty/invalid entity_id
    // Also filter out status messages (first item from bhansalisoft often has a string message as user_id)
    const validData = insertData.filter(item => {
      if (!item.entity_id || item.entity_id === "" || item.entity_id === "0") {
        return false;
      }
      // Filter out non-numeric entity IDs (status messages from scraper like "please go to Log tab...")
      if (isNaN(Number(item.entity_id))) {
        logger.debug(`Filtering out non-numeric entity_id: ${item.entity_id}`);
        return false;
      }
      return true;
    });
    logger.info(`Valid items to insert: ${validData.length} of ${insertData.length}`);

    if (validData.length === 0) {
      const errorMsg = "No valid items to insert - all items missing entity_id";
      logger.error(errorMsg);
      return { 
        savedCount: 0, 
        totalItems: allItems.length, 
        validItems: 0,
        error: errorMsg 
      };
    }

    // Log a sample of what we're trying to insert
    logger.info(`Sample insert data: ${JSON.stringify(validData[0], null, 2)}`);

    // Insert in batches using upsert
    const BATCH_SIZE = 500;
    let savedCount = 0;
    let lastError: { code?: string; message?: string; details?: string; hint?: string } | null = null;

    for (let i = 0; i < validData.length; i += BATCH_SIZE) {
      const batch = validData.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from("scraped_data")
        .upsert(batch, {
          onConflict: "scraper_type,source_identifier,entity_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (!error) {
        savedCount += data?.length || batch.length;
        logger.info(`Batch ${i / BATCH_SIZE + 1}: saved ${data?.length || batch.length} rows`);
      } else {
        lastError = error;
        logger.error(`Batch insert error at ${i}: code=${error.code}, message=${error.message}, details=${error.details}, hint=${error.hint}`);
      }
    }

    if (savedCount === 0 && lastError) {
      logger.error(`All batches failed. Error: code=${lastError.code}, message=${lastError.message}, details=${lastError.details}, hint=${lastError.hint}`);
    }

    // Update run with final count
    await supabase
      .from("scraper_runs")
      .update({ items_count: savedCount })
      .eq("id", dbRunId);

    logger.info(`Auto-saved ${savedCount} items for run ${dbRunId}`);
    
    return { 
      savedCount, 
      totalItems: allItems.length, 
      validItems: validData.length,
      error: lastError?.message,
      errorCode: lastError?.code,
      errorDetails: lastError?.details,
    };
  } catch (error) {
    logger.error(`Failed to auto-save data for run ${dbRunId}`, error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return { 
      savedCount: 0, 
      totalItems: 0, 
      validItems: 0,
      error: errMsg 
    };
  }
}

/**
 * Sync a specific run - fetch latest data from Apify and update database
 * Use this for runs that completed but weren't synced properly
 */
export async function syncRunData(runId: string): Promise<{
  success: boolean;
  itemsCount: number;
  dataSaved: number;
  sampleData?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
  errorDetails?: string;
}> {
  const supabase = getServerSupabase();
  
  try {
    // Get run info from Apify
    const apifyRun = await getRunStatus(runId);
    
    // Get database record
    const { data: dbRun } = await supabase
      .from("scraper_runs")
      .select("*")
      .eq("run_id", runId)
      .single();

    if (!dbRun) {
      return { success: false, itemsCount: 0, dataSaved: 0, error: "Run not found in database" };
    }

    const newDbStatus = mapApifyToDbStatus(apifyRun.status as ApifyRunStatus);
    
    // Update database with latest info from Apify
    await supabase
      .from("scraper_runs")
      .update({
        status: newDbStatus,
        items_count: apifyRun.itemsCount,
        duration_ms: apifyRun.durationMs,
        finished_at: apifyRun.finishedAt,
        error_message: apifyRun.errorMessage,
      })
      .eq("run_id", runId);

    logger.info(`Synced run ${runId}: status=${newDbStatus}, items=${apifyRun.itemsCount}`);

    // If run succeeded and has items, save the data to telegram_members
    let dataSaved = 0;
    let sampleData: Record<string, unknown> | undefined;
    let saveError: string | undefined;
    let saveErrorCode: string | undefined;
    let saveErrorDetails: string | undefined;
    
    if (apifyRun.status === "SUCCEEDED" && apifyRun.itemsCount > 0) {
      // First, get a sample to return for debugging
      const { items } = await getRunData(apifyRun.datasetId, 1, 0);
      if (items.length > 0) {
        sampleData = items[0] as unknown as Record<string, unknown>;
      }
      
      // Determine scraper type from actor ID
      const scraperType = dbRun.actor_id?.includes("telegram") ? "telegram" : "custom";
      const saveResult = await autoSaveRunData(dbRun.id, apifyRun.datasetId, scraperType);
      dataSaved = saveResult.savedCount;
      saveError = saveResult.error;
      saveErrorCode = saveResult.errorCode;
      saveErrorDetails = saveResult.errorDetails;
      
      // If no data was saved, return detailed error info
      if (dataSaved === 0) {
        // Build detailed error message
        let errorMessage = "Data found but failed to save.";
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          errorMessage += " SUPABASE_SERVICE_ROLE_KEY not configured on server!";
        }
        if (saveError) {
          errorMessage += ` DB Error: ${saveError}`;
        }
        if (saveResult.validItems === 0 && saveResult.totalItems > 0) {
          errorMessage += " All items missing entity_id field.";
        }
        
        return {
          success: false,
          itemsCount: apifyRun.itemsCount,
          dataSaved: 0,
          sampleData,
          error: errorMessage,
          errorCode: saveErrorCode,
          errorDetails: saveErrorDetails,
        };
      }
    }

    return {
      success: true,
      itemsCount: apifyRun.itemsCount,
      dataSaved,
      sampleData,
    };
  } catch (error) {
    logger.error(`Failed to sync run ${runId}`, error);
    return {
      success: false,
      itemsCount: 0,
      dataSaved: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Monitor all active runs and handle state changes
 */
export async function monitorActiveRuns(options: {
  autoSaveOnComplete?: boolean;
} = {}): Promise<{
  checked: number;
  updated: number;
  completed: number;
  dataSaved: number;
  runs: MonitoredRun[];
}> {
  const { autoSaveOnComplete = true } = options;
  const supabase = getServerSupabase();
  
  // Get all active runs AND recently completed runs with 0 items (need sync)
  const { data: activeRuns, error } = await supabase
    .from("scraper_runs")
    .select("run_id, id, dataset_id, status, items_count, actor_id")
    .or("status.in.(pending,running),and(status.eq.succeeded,items_count.eq.0)");

  if (error) {
    logger.error("Failed to fetch active runs", error);
    return { checked: 0, updated: 0, completed: 0, dataSaved: 0, runs: [] };
  }

  if (!activeRuns || activeRuns.length === 0) {
    return { checked: 0, updated: 0, completed: 0, dataSaved: 0, runs: [] };
  }

  const results: MonitoredRun[] = [];
  let updated = 0;
  let completed = 0;
  let dataSaved = 0;

  // Check each active run
  for (const run of activeRuns) {
    const result = await checkRunStatus(run.run_id);
    
    if (result) {
      results.push(result);
      
      if (result.wasUpdated) {
        updated++;
      }

      // Handle completed runs
      if (result.isFinished) {
        completed++;

        // Auto-save data on successful completion
        if (autoSaveOnComplete && result.apifyStatus === "SUCCEEDED") {
          const scraperType = run.actor_id?.includes("telegram") ? "telegram" : "custom";
          const saveResult = await autoSaveRunData(run.id, result.datasetId, scraperType);
          if (saveResult.savedCount > 0) {
            result.dataSaved = true;
            dataSaved += saveResult.savedCount;
          }
        }
      }
    }
  }

  logger.info(`Monitor check complete: ${results.length} runs checked, ${updated} updated, ${completed} completed, ${dataSaved} items saved`);

  return {
    checked: results.length,
    updated,
    completed,
    dataSaved,
    runs: results,
  };
}

/**
 * Get summary of all runs by status
 */
export async function getRunsSummary(): Promise<{
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  aborted: number;
  total: number;
}> {
  const supabase = getServerSupabase();
  
  const { data, error } = await supabase
    .from("scraper_runs")
    .select("status");

  if (error || !data) {
    return { pending: 0, running: 0, succeeded: 0, failed: 0, aborted: 0, total: 0 };
  }

  const counts = {
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    aborted: 0,
    timed_out: 0,
  };

  data.forEach((run) => {
    const status = run.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  });

  return {
    pending: counts.pending,
    running: counts.running,
    succeeded: counts.succeeded,
    failed: counts.failed + counts.timed_out,
    aborted: counts.aborted,
    total: data.length,
  };
}
