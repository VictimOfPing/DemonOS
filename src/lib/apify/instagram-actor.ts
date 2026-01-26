/**
 * Instagram Followers/Following Actor Functions
 * Functions for scraping_solutions/instagram-scraper-followers-following-no-cookies
 * @see https://apify.com/scraping_solutions/instagram-scraper-followers-following-no-cookies
 */

import { apifyClient, ACTOR_IDS, getRunLogs } from "./client";
import type {
  InstagramActorInput,
  ScraperRunInfo,
  InstagramFollower,
  ApifyRunStatus,
  InstagramScraperType,
} from "./types";

/** Default results limit if not specified */
const DEFAULT_RESULTS_LIMIT = 200;

/**
 * Parse and normalize Instagram username
 * Supports various input formats:
 * - username
 * - @username
 * - https://instagram.com/username
 * - https://www.instagram.com/username/
 */
export function parseInstagramUsername(input: string): string {
  let cleanUsername = input.trim();

  // Remove @ prefix
  if (cleanUsername.startsWith("@")) {
    cleanUsername = cleanUsername.substring(1);
  }

  // Handle full URLs
  if (cleanUsername.includes("instagram.com")) {
    // Extract username from URL
    const urlMatch = cleanUsername.match(/instagram\.com\/([^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      cleanUsername = urlMatch[1];
    }
  }

  // Remove trailing slashes and query params
  cleanUsername = cleanUsername.split("/")[0].split("?")[0];

  return cleanUsername;
}

/**
 * Start a new run of the Instagram Followers/Following scraper (async - returns immediately)
 * @param usernames - Array of Instagram usernames to scrape
 * @param options - Optional configuration (resultsLimit, dataToScrape)
 */
export async function startInstagramScraperAsync(
  usernames: string[],
  options: {
    resultsLimit?: number;
    dataToScrape?: InstagramScraperType;
  } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all usernames
  const cleanUsernames = usernames.map(parseInstagramUsername);

  const input: InstagramActorInput = {
    Account: cleanUsernames,
    resultsLimit: options.resultsLimit ?? DEFAULT_RESULTS_LIMIT,
    dataToScrape: options.dataToScrape ?? "Followers",
  };

  const run = await apifyClient
    .actor(ACTOR_IDS.INSTAGRAM_FOLLOWERS)
    .start(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.INSTAGRAM_FOLLOWERS,
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
 * Start a new run of the Instagram Followers/Following scraper (sync - waits for completion)
 * @param usernames - Array of Instagram usernames to scrape
 * @param options - Optional configuration (resultsLimit, dataToScrape)
 */
export async function startInstagramScraper(
  usernames: string[],
  options: {
    resultsLimit?: number;
    dataToScrape?: InstagramScraperType;
  } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all usernames
  const cleanUsernames = usernames.map(parseInstagramUsername);

  const input: InstagramActorInput = {
    Account: cleanUsernames,
    resultsLimit: options.resultsLimit ?? DEFAULT_RESULTS_LIMIT,
    dataToScrape: options.dataToScrape ?? "Followers",
  };

  const run = await apifyClient
    .actor(ACTOR_IDS.INSTAGRAM_FOLLOWERS)
    .call(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.INSTAGRAM_FOLLOWERS,
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
 * Get the status of a specific Instagram scraper run
 */
export async function getInstagramRunStatus(runId: string): Promise<ScraperRunInfo> {
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
 * Get data from an Instagram scraper run's dataset
 * Returns transformed InstagramFollower objects
 */
export async function getInstagramRunData(
  datasetId: string,
  limit = 100,
  offset = 0
): Promise<{ items: InstagramFollower[]; total: number; hasMore: boolean }> {
  const dataset = await apifyClient.dataset(datasetId).get();
  const total = dataset?.itemCount || 0;

  const result = await apifyClient
    .dataset(datasetId)
    .listItems({ limit, offset });

  // Map the raw items to InstagramFollower type (new scraper format)
  const items: InstagramFollower[] = result.items.map((item: Record<string, unknown>) => ({
    username_scrape: (item.username_scrape as string) || "",
    type: (item.type as InstagramScraperType) || "Followers",
    id: String(item.id || ""),
    username: (item.username as string) || "",
    full_name: (item.full_name as string) || "",
    profile_pic_url: (item.profile_pic_url as string) || "",
    is_private: Boolean(item.is_private),
    is_verified: Boolean(item.is_verified),
  }));

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get RAW data from an Instagram scraper run's dataset (no transformation)
 * Use this when you need the original data structure
 */
export async function getInstagramRunDataRaw(
  datasetId: string,
  limit = 100,
  offset = 0
): Promise<{ items: Record<string, unknown>[]; total: number; hasMore: boolean }> {
  const dataset = await apifyClient.dataset(datasetId).get();
  const total = dataset?.itemCount || 0;

  const result = await apifyClient
    .dataset(datasetId)
    .listItems({ limit, offset });

  return {
    items: result.items as Record<string, unknown>[],
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get logs for a specific Instagram scraper run
 */
export async function getInstagramRunLogs(runId: string): Promise<string> {
  return getRunLogs(runId);
}

/**
 * Abort a running Instagram scraper
 */
export async function abortInstagramRun(runId: string): Promise<ScraperRunInfo> {
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
 * Wait for an Instagram scraper run to finish
 */
export async function waitForInstagramRunToFinish(
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
