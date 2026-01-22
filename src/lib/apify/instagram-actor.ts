/**
 * Instagram Followers Actor Functions
 * Functions for thenetaji/instagram-followers-scraper
 * @see https://apify.com/thenetaji/instagram-followers-scraper
 */

import { apifyClient, ACTOR_IDS, getRunLogs } from "./client";
import type {
  InstagramActorInput,
  ScraperRunInfo,
  InstagramFollower,
  ApifyRunStatus,
  InstagramScraperType,
  InstagramBioLink,
} from "./types";

/** Default max items if not specified */
const DEFAULT_MAX_ITEMS = 100;

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
 * Start a new run of the Instagram Followers scraper (async - returns immediately)
 * @param usernames - Array of Instagram usernames to scrape followers from
 * @param options - Optional configuration (maxItem, profileEnriched, type)
 */
export async function startInstagramScraperAsync(
  usernames: string[],
  options: {
    maxItem?: number;
    profileEnriched?: boolean;
    type?: InstagramScraperType;
  } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all usernames
  const cleanUsernames = usernames.map(parseInstagramUsername);

  const input: InstagramActorInput = {
    username: cleanUsernames,
    maxItem: options.maxItem ?? DEFAULT_MAX_ITEMS,
    profileEnriched: options.profileEnriched ?? false,
    type: options.type ?? "followers",
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
 * Start a new run of the Instagram Followers scraper (sync - waits for completion)
 * @param usernames - Array of Instagram usernames to scrape followers from
 * @param options - Optional configuration (maxItem, profileEnriched, type)
 */
export async function startInstagramScraper(
  usernames: string[],
  options: {
    maxItem?: number;
    profileEnriched?: boolean;
    type?: InstagramScraperType;
  } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all usernames
  const cleanUsernames = usernames.map(parseInstagramUsername);

  const input: InstagramActorInput = {
    username: cleanUsernames,
    maxItem: options.maxItem ?? DEFAULT_MAX_ITEMS,
    profileEnriched: options.profileEnriched ?? false,
    type: options.type ?? "followers",
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

  // Map the raw items to InstagramFollower type
  const items: InstagramFollower[] = result.items.map((item: Record<string, unknown>) => {
    // Check if this is enriched data (has biography field) or basic data
    const isEnriched = "biography" in item || "edge_followed_by" in item;

    if (isEnriched) {
      return {
        id: String(item.id || ""),
        username: (item.username as string) || "",
        full_name: (item.full_name as string) || "",
        profile_pic_url: (item.profile_pic_url as string) || "",
        profile_pic_url_hd: (item.profile_pic_url_hd as string) || undefined,
        biography: (item.biography as string) || undefined,
        bio_links: item.bio_links as InstagramBioLink[] | undefined,
        external_url: item.external_url as string | null,
        is_private: Boolean(item.is_private),
        is_verified: Boolean(item.is_verified),
        is_business_account: Boolean(item.is_business_account),
        is_professional_account: Boolean(item.is_professional_account),
        category_name: item.category_name as string | null,
        edge_followed_by: item.edge_followed_by as { count: number } | undefined,
        edge_follow: item.edge_follow as { count: number } | undefined,
        edge_owner_to_timeline_media: item.edge_owner_to_timeline_media as { count: number } | undefined,
        fbid: item.fbid as string | undefined,
        followed_by_viewer: Boolean(item.followed_by_viewer),
        requested_by_viewer: Boolean(item.requested_by_viewer),
        follows_viewer: Boolean(item.follows_viewer),
        blocked_by_viewer: Boolean(item.blocked_by_viewer),
        has_clips: Boolean(item.has_clips),
        has_guides: Boolean(item.has_guides),
        has_channel: Boolean(item.has_channel),
        highlight_reel_count: (item.highlight_reel_count as number) || undefined,
        is_joined_recently: Boolean(item.is_joined_recently),
        pronouns: (item.pronouns as string[]) || [],
      };
    }

    // Basic follower data
    return {
      id: String(item.id || ""),
      username: (item.username as string) || "",
      full_name: (item.full_name as string) || "",
      profile_pic_url: (item.profile_pic_url as string) || "",
      is_private: Boolean(item.is_private),
      is_verified: Boolean(item.is_verified),
      followed_by_viewer: Boolean(item.followed_by_viewer),
      requested_by_viewer: Boolean(item.requested_by_viewer),
    };
  });

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
