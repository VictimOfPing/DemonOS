/**
 * Scraper Monitor Service
 * Monitors active scraper runs and handles state changes
 */

import { getRunStatus, getRunData } from "@/lib/apify/telegram-actor";
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

/**
 * Auto-save data for a completed run
 */
export async function autoSaveRunData(
  dbRunId: string,
  datasetId: string
): Promise<number> {
  const supabase = getServerSupabase();
  
  try {
    // Fetch all data from Apify
    let allItems: Record<string, unknown>[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { items, hasMore: more } = await getRunData(datasetId, batchSize, offset);
      allItems = allItems.concat(items as unknown as Record<string, unknown>[]);
      hasMore = more;
      offset += batchSize;

      // Safety limit
      if (allItems.length > 50000) {
        logger.warn("Auto-save safety limit reached");
        break;
      }
    }

    if (allItems.length === 0) {
      return 0;
    }

    // Log first item to debug structure
    logger.info(`Sample item structure: ${JSON.stringify(allItems[0], null, 2)}`);

    // Get the source_url from the run's input config in database
    const { data: runData } = await supabase
      .from("scraper_runs")
      .select("input_config")
      .eq("id", dbRunId)
      .single();
    
    const inputConfig = runData?.input_config as Record<string, unknown> || {};
    const defaultSourceUrl = (inputConfig.Target_Group || inputConfig.targetGroup || "unknown_group") as string;

    // Map to database schema - handle bhansalisoft scraper format:
    // { user_id, user_name, access_hash, first_name, last_name }
    const insertData = allItems.map((item) => {
      // Get telegram_id - bhansalisoft uses "user_id"
      const telegramId = String(
        item.user_id || item.telegram_id || item.id || item.userId || ""
      );
      
      // Get source_url from item or use default from input config
      const sourceUrl = (
        item.source_url || 
        item.group_url || 
        item.channel_url || 
        item.group || 
        defaultSourceUrl
      ) as string;

      // Get username - bhansalisoft uses "user_name" (singular)
      let usernames: string[] = [];
      if (item.user_name) {
        usernames = [item.user_name as string];
      } else if (Array.isArray(item.usernames)) {
        usernames = item.usernames;
      } else if (item.username) {
        usernames = [item.username as string];
      }

      return {
        // Skip run_id to avoid foreign key issues - we can link later
        source_url: sourceUrl,
        processor: "bhansalisoft/telegram-group-member-scraper",
        processed_at: new Date().toISOString(),
        telegram_id: telegramId,
        first_name: (item.first_name || item.firstName) as string || null,
        last_name: (item.last_name || item.lastName) as string || null,
        usernames: usernames,
        phone: (item.phone) as string || null,
        type: "user",
        is_deleted: false,
        is_verified: false,
        is_premium: false,
        is_scam: false,
        is_fake: false,
        is_restricted: false,
        lang_code: null,
        last_seen: null,
        stories_hidden: false,
        premium_contact: false,
      };
    });

    // Filter out items with empty telegram_id
    const validData = insertData.filter(item => item.telegram_id && item.telegram_id !== "" && item.telegram_id !== "0");
    logger.info(`Valid items to insert: ${validData.length} of ${insertData.length}`);

    if (validData.length === 0) {
      logger.error("No valid items to insert - all items missing telegram_id");
      return 0;
    }

    // Log a sample of what we're trying to insert
    logger.info(`Sample insert data: ${JSON.stringify(validData[0], null, 2)}`);
    logger.info(`run_id (UUID) being used: ${dbRunId}`);

    // Insert in batches - try without upsert first to see the error
    const BATCH_SIZE = 500;
    let savedCount = 0;
    let lastError: unknown = null;

    for (let i = 0; i < validData.length; i += BATCH_SIZE) {
      const batch = validData.slice(i, i + BATCH_SIZE);
      
      // Try insert (not upsert) to see clearer errors
      const { data, error } = await supabase
        .from("telegram_members")
        .insert(batch)
        .select("id");

      if (!error) {
        savedCount += data?.length || batch.length;
        logger.info(`Batch ${i / BATCH_SIZE + 1}: inserted ${data?.length || batch.length} rows`);
      } else {
        lastError = error;
        logger.error(`Batch insert error at ${i}: code=${error.code}, message=${error.message}, details=${error.details}, hint=${error.hint}`);
        
        // If it's a duplicate key error, try upsert for this batch
        if (error.code === "23505") {
          const { data: upsertData, error: upsertError } = await supabase
            .from("telegram_members")
            .upsert(batch, {
              onConflict: "telegram_id,source_url",
              ignoreDuplicates: true,
            })
            .select("id");
          
          if (!upsertError) {
            savedCount += upsertData?.length || batch.length;
            logger.info(`Batch ${i / BATCH_SIZE + 1}: upserted ${upsertData?.length || batch.length} rows after duplicate error`);
          } else {
            logger.error(`Upsert also failed: ${upsertError.message}`);
          }
        }
      }
    }

    if (savedCount === 0 && lastError) {
      const err = lastError as { code?: string; message?: string; details?: string; hint?: string };
      logger.error(`All batches failed. Error: code=${err.code}, message=${err.message}, details=${err.details}, hint=${err.hint}`);
    }

    // Update run with final count
    await supabase
      .from("scraper_runs")
      .update({ items_count: savedCount })
      .eq("id", dbRunId);

    logger.info(`Auto-saved ${savedCount} items for run ${dbRunId}`);
    return savedCount;
  } catch (error) {
    logger.error(`Failed to auto-save data for run ${dbRunId}`, error);
    return 0;
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
    
    if (apifyRun.status === "SUCCEEDED" && apifyRun.itemsCount > 0) {
      // First, get a sample to return for debugging
      const { items } = await getRunData(apifyRun.datasetId, 1, 0);
      if (items.length > 0) {
        sampleData = items[0] as unknown as Record<string, unknown>;
      }
      
      dataSaved = await autoSaveRunData(dbRun.id, apifyRun.datasetId);
      
      // If no data was saved, return the sample for debugging
      if (dataSaved === 0) {
        return {
          success: false,
          itemsCount: apifyRun.itemsCount,
          dataSaved: 0,
          sampleData,
          error: "Data found but failed to save. Check logs for details.",
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
    .select("run_id, id, dataset_id, status, items_count")
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
          const saved = await autoSaveRunData(run.id, result.datasetId);
          if (saved > 0) {
            result.dataSaved = true;
            dataSaved += saved;
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
