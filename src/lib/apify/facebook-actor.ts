/**
 * Facebook Group Member Actor Functions
 * Functions for easyapi/facebook-group-members-scraper
 * @see https://apify.com/easyapi/facebook-group-members-scraper
 */

import { apifyClient, ACTOR_IDS, getRunLogs } from "./client";
import type {
  FacebookActorInput,
  ScraperRunInfo,
  FacebookGroupMember,
  ApifyRunStatus,
} from "./types";

/** Default max items if not specified */
const DEFAULT_MAX_ITEMS = 50;

/**
 * Parse and normalize Facebook group URL
 * Supports various URL formats:
 * - https://www.facebook.com/groups/123456/
 * - https://facebook.com/groups/groupname
 * - facebook.com/groups/123456
 */
export function parseFacebookGroupUrl(url: string): string {
  let cleanUrl = url.trim();
  
  // Add https:// if no protocol
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = `https://${cleanUrl}`;
  }
  
  // Ensure www. prefix for consistency
  if (cleanUrl.includes("facebook.com") && !cleanUrl.includes("www.facebook.com")) {
    cleanUrl = cleanUrl.replace("facebook.com", "www.facebook.com");
  }
  
  // Remove trailing slash and add it back for consistency
  cleanUrl = cleanUrl.replace(/\/+$/, "") + "/";
  
  return cleanUrl;
}

/**
 * Start a new run of the Facebook Group Member scraper (async - returns immediately)
 * @param groupUrls - Array of Facebook group URLs to scrape
 * @param options - Optional configuration (maxItems)
 */
export async function startFacebookScraperAsync(
  groupUrls: string[],
  options: { maxItems?: number } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all URLs
  const cleanUrls = groupUrls.map(parseFacebookGroupUrl);
  
  const input: FacebookActorInput = {
    groupUrls: cleanUrls,
    maxItems: options.maxItems || DEFAULT_MAX_ITEMS,
  };

  const run = await apifyClient
    .actor(ACTOR_IDS.FACEBOOK_GROUP_MEMBER)
    .start(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.FACEBOOK_GROUP_MEMBER,
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
 * Start a new run of the Facebook Group Member scraper (sync - waits for completion)
 * @param groupUrls - Array of Facebook group URLs to scrape
 * @param options - Optional configuration (maxItems)
 */
export async function startFacebookScraper(
  groupUrls: string[],
  options: { maxItems?: number } = {}
): Promise<ScraperRunInfo> {
  // Clean and normalize all URLs
  const cleanUrls = groupUrls.map(parseFacebookGroupUrl);
  
  const input: FacebookActorInput = {
    groupUrls: cleanUrls,
    maxItems: options.maxItems || DEFAULT_MAX_ITEMS,
  };

  const run = await apifyClient
    .actor(ACTOR_IDS.FACEBOOK_GROUP_MEMBER)
    .call(input);

  return {
    id: run.id,
    actorId: ACTOR_IDS.FACEBOOK_GROUP_MEMBER,
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
 * Get the status of a specific Facebook scraper run
 */
export async function getFacebookRunStatus(runId: string): Promise<ScraperRunInfo> {
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
 * Get data from a Facebook scraper run's dataset
 * Returns transformed FacebookGroupMember objects
 */
export async function getFacebookRunData(
  datasetId: string,
  limit = 100,
  offset = 0
): Promise<{ items: FacebookGroupMember[]; total: number; hasMore: boolean }> {
  const dataset = await apifyClient.dataset(datasetId).get();
  const total = dataset?.itemCount || 0;

  const result = await apifyClient
    .dataset(datasetId)
    .listItems({ limit, offset });

  // Map the raw items to FacebookGroupMember type
  const items: FacebookGroupMember[] = result.items.map((item: Record<string, unknown>) => {
    const member = item.member as Record<string, unknown> | undefined;
    const groupInfo = member?.groupInfo as Record<string, unknown> | undefined;
    
    return {
      groupUrl: (item.groupUrl as string) || "",
      member: {
        id: String(member?.id || ""),
        name: (member?.name as string) || "",
        profileUrl: (member?.profileUrl as string) || "",
        isVerified: Boolean(member?.isVerified),
        profilePicture: (member?.profilePicture as string) || null,
        bio: (member?.bio as string) || null,
        groupInfo: {
          membershipId: String(groupInfo?.membershipId || ""),
          contributionScore: (groupInfo?.contributionScore as number) || null,
          totalSignals: (groupInfo?.totalSignals as number) || 0,
        },
      },
      scrapedAt: (item.scrapedAt as string) || new Date().toISOString(),
    };
  });

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get RAW data from a Facebook scraper run's dataset (no transformation)
 * Use this when you need the original data structure
 */
export async function getFacebookRunDataRaw(
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
 * Get logs for a specific Facebook scraper run
 */
export async function getFacebookRunLogs(runId: string): Promise<string> {
  return getRunLogs(runId);
}

/**
 * Abort a running Facebook scraper
 */
export async function abortFacebookRun(runId: string): Promise<ScraperRunInfo> {
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
 * Wait for a Facebook scraper run to finish
 */
export async function waitForFacebookRunToFinish(
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
