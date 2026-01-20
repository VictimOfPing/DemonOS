/**
 * Telegram Group Member Actor Functions
 * Functions for bhansalisoft/telegram-group-member-scraper
 * @see https://console.apify.com/actors/hLFj6Ay1gfoDw4MLO
 */

import { apifyClient, ACTOR_IDS, getRunLogs } from "./client";
import type {
  TelegramActorInput,
  ScraperRunInfo,
  TelegramMember,
  ApifyRunStatus,
} from "./types";

/**
 * Start a new run of the Telegram Group Member scraper
 * @param targetGroup - Group name or username (e.g., "bhansalisoft" or "mygroup")
 * @param options - Optional auth token for private groups
 */
export async function startTelegramScraper(
  targetGroup: string,
  options: { authToken?: string } = {}
): Promise<ScraperRunInfo> {
  // Clean up the target group name - remove @ prefix and URL parts
  let cleanGroupName = targetGroup.trim();
  if (cleanGroupName.startsWith("@")) {
    cleanGroupName = cleanGroupName.substring(1);
  }
  if (cleanGroupName.includes("t.me/")) {
    cleanGroupName = cleanGroupName.split("t.me/").pop() || cleanGroupName;
  }
  if (cleanGroupName.includes("/")) {
    cleanGroupName = cleanGroupName.split("/")[0];
  }

  const input: TelegramActorInput = {
    Target_Group: cleanGroupName,
  };

  // Add auth token if provided
  if (options.authToken) {
    input.Telegram_Auth_Token = options.authToken;
  }

  const run = await apifyClient
    .actor(ACTOR_IDS.TELEGRAM_GROUP_MEMBER)
    .call(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.TELEGRAM_GROUP_MEMBER,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: 0,
    durationMs: run.stats?.durationMillis || 0,
    datasetId: run.defaultDatasetId,
    errorMessage: run.statusMessage || null,
  };
}

/**
 * Start a run asynchronously (returns immediately, run executes in background)
 * @param targetGroup - Group name or username (e.g., "bhansalisoft" or "mygroup")
 * @param options - Optional auth token for private groups
 */
export async function startTelegramScraperAsync(
  targetGroup: string,
  options: { authToken?: string } = {}
): Promise<ScraperRunInfo> {
  // Clean up the target group name
  let cleanGroupName = targetGroup.trim();
  if (cleanGroupName.startsWith("@")) {
    cleanGroupName = cleanGroupName.substring(1);
  }
  if (cleanGroupName.includes("t.me/")) {
    cleanGroupName = cleanGroupName.split("t.me/").pop() || cleanGroupName;
  }
  if (cleanGroupName.includes("/")) {
    cleanGroupName = cleanGroupName.split("/")[0];
  }

  const input: TelegramActorInput = {
    Target_Group: cleanGroupName,
  };

  if (options.authToken) {
    input.Telegram_Auth_Token = options.authToken;
  }

  const run = await apifyClient
    .actor(ACTOR_IDS.TELEGRAM_GROUP_MEMBER)
    .start(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.TELEGRAM_GROUP_MEMBER,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: 0,
    durationMs: run.stats?.durationMillis || 0,
    datasetId: run.defaultDatasetId,
    errorMessage: run.statusMessage || null,
  };
}

/**
 * Get the status of a specific run
 */
export async function getRunStatus(runId: string): Promise<ScraperRunInfo> {
  const run = await apifyClient.run(runId).get();

  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  // Get dataset item count
  const dataset = await apifyClient.dataset(run.defaultDatasetId).get();

  return {
    id: run.id,
    actorId: run.actId,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: dataset?.itemCount || 0,
    durationMs: run.stats?.durationMillis || 0,
    datasetId: run.defaultDatasetId,
    errorMessage: run.statusMessage || null,
  };
}

/**
 * Get all runs for the Telegram actor
 */
export async function getTelegramRuns(
  limit = 10,
  offset = 0
): Promise<{ items: ScraperRunInfo[]; total: number }> {
  const runs = await apifyClient
    .actor(ACTOR_IDS.TELEGRAM_GROUP_MEMBER)
    .runs()
    .list({ limit, offset, desc: true });

  const items: ScraperRunInfo[] = runs.items.map((run) => ({
    id: run.id,
    actorId: run.actId,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: 0, // Would need additional API calls to get this
    durationMs: 0, // Not available in list response
    datasetId: run.defaultDatasetId,
    errorMessage: null, // Not available in list response
  }));

  return {
    items,
    total: runs.total,
  };
}

/**
 * Abort a running scraper
 */
export async function abortRun(runId: string): Promise<ScraperRunInfo> {
  const run = await apifyClient.run(runId).abort();

  return {
    id: run.id,
    actorId: run.actId,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: 0,
    durationMs: run.stats?.durationMillis || 0,
    datasetId: run.defaultDatasetId,
    errorMessage: run.statusMessage || null,
  };
}

/**
 * Get data from a run's dataset
 */
export async function getRunData(
  datasetId: string,
  limit = 100,
  offset = 0
): Promise<{ items: TelegramMember[]; total: number; hasMore: boolean }> {
  const dataset = await apifyClient.dataset(datasetId).get();
  const total = dataset?.itemCount || 0;

  const result = await apifyClient
    .dataset(datasetId)
    .listItems({ limit, offset });

  // Map the raw items to TelegramMember type - matches Apify output structure
  const items: TelegramMember[] = result.items.map((item: Record<string, unknown>) => ({
    source_url: (item.source_url as string) || "",
    processor: (item.processor as string) || "",
    processed_at: (item.processed_at as string) || new Date().toISOString(),
    id: String(item.id || ""),
    first_name: (item.first_name as string) || null,
    last_name: (item.last_name as string) || null,
    usernames: Array.isArray(item.usernames) ? item.usernames as string[] : [],
    phone: (item.phone as string) || null,
    type: (item.type as string) || "user",
    is_deleted: Boolean(item.is_deleted),
    is_verified: Boolean(item.is_verified),
    is_premium: Boolean(item.is_premium),
    is_scam: Boolean(item.is_scam),
    is_fake: Boolean(item.is_fake),
    is_restricted: Boolean(item.is_restricted),
    lang_code: (item.lang_code as string) || null,
    last_seen: (item.last_seen as string) || null,
    stories_hidden: Boolean(item.stories_hidden),
    premium_contact: Boolean(item.premium_contact),
  }));

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get logs for a specific run
 */
export async function getTelegramRunLogs(runId: string): Promise<string> {
  return getRunLogs(runId);
}

/**
 * Wait for a run to finish
 */
export async function waitForRunToFinish(
  runId: string,
  timeoutMs = 300000 // 5 minutes default
): Promise<ScraperRunInfo> {
  const run = await apifyClient.run(runId).waitForFinish({
    waitSecs: Math.floor(timeoutMs / 1000),
  });

  if (!run) {
    throw new Error(`Run ${runId} timed out or not found`);
  }

  const dataset = await apifyClient.dataset(run.defaultDatasetId).get();

  return {
    id: run.id,
    actorId: run.actId,
    status: run.status as ApifyRunStatus,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    finishedAt: run.finishedAt?.toISOString() || null,
    itemsCount: dataset?.itemCount || 0,
    durationMs: run.stats?.durationMillis || 0,
    datasetId: run.defaultDatasetId,
    errorMessage: run.statusMessage || null,
  };
}
