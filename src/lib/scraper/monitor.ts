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

    // Map to database schema
    const insertData = allItems.map((item) => ({
      run_id: dbRunId,
      source_url: item.source_url as string || "",
      processor: item.processor as string || "",
      processed_at: item.processed_at as string || new Date().toISOString(),
      telegram_id: String(item.id || ""),
      first_name: item.first_name as string || null,
      last_name: item.last_name as string || null,
      usernames: Array.isArray(item.usernames) ? item.usernames : [],
      phone: item.phone as string || null,
      type: item.type as string || "user",
      is_deleted: Boolean(item.is_deleted),
      is_verified: Boolean(item.is_verified),
      is_premium: Boolean(item.is_premium),
      is_scam: Boolean(item.is_scam),
      is_fake: Boolean(item.is_fake),
      is_restricted: Boolean(item.is_restricted),
      lang_code: item.lang_code as string || null,
      last_seen: item.last_seen as string || null,
      stories_hidden: Boolean(item.stories_hidden),
      premium_contact: Boolean(item.premium_contact),
    }));

    // Insert in batches
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

      if (!error) {
        savedCount += batch.length;
      } else {
        logger.error(`Batch insert error at ${i}`, error);
      }
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
  
  // Get all active runs from database
  const { data: activeRuns, error } = await supabase
    .from("scraper_runs")
    .select("run_id, id, dataset_id, status")
    .in("status", ["pending", "running"]);

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
