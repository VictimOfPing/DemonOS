/**
 * Apify API Client
 * Configured client for interacting with Apify platform
 */

import { ApifyClient } from "apify-client";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_API_TOKEN) {
  console.warn("Warning: APIFY_API_TOKEN is not set in environment variables");
}

/**
 * Singleton Apify client instance
 * Uses the official apify-client SDK for type-safe API interactions
 */
export const apifyClient = new ApifyClient({
  token: APIFY_API_TOKEN,
});

/**
 * Base URL for direct API calls when SDK doesn't support certain endpoints
 */
export const APIFY_API_BASE_URL = "https://api.apify.com/v2";

/**
 * Actor IDs for available scrapers
 */
export const ACTOR_IDS = {
  /** bhansalisoft/telegram-group-member-scraper - Telegram Groups/Channel Member Scraper */
  TELEGRAM_GROUP_MEMBER: "bhansalisoft/telegram-group-member-scraper",
  /** easyapi/facebook-group-members-scraper - Facebook Group Members Scraper */
  FACEBOOK_GROUP_MEMBER: "easyapi/facebook-group-members-scraper",
  /** scraping_solutions/instagram-scraper-followers-following-no-cookies - Instagram Followers/Following Exporter */
  INSTAGRAM_FOLLOWERS: "scraping_solutions/instagram-scraper-followers-following-no-cookies",
  /** thenetaji/instagram-followers-scraper - Alternative Instagram Followers Scraper */
  INSTAGRAM_FOLLOWERS_ALT: "thenetaji/instagram-followers-scraper",
} as const;

/**
 * Make a direct API call to Apify
 * Used for endpoints not covered by the SDK
 */
export async function apifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${APIFY_API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${APIFY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `Apify API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get logs for a specific run
 */
export async function getRunLogs(runId: string): Promise<string> {
  const response = await fetch(`${APIFY_API_BASE_URL}/logs/${runId}`, {
    headers: {
      "Authorization": `Bearer ${APIFY_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Resurrect a failed/timed-out run
 * This continues the run from where it stopped
 * @see https://docs.apify.com/api/v2#/reference/actor-runs/resurrect-run
 */
export async function resurrectRun(runId: string): Promise<{
  id: string;
  status: string;
  startedAt: string;
  datasetId: string;
}> {
  const run = await apifyClient.run(runId).resurrect();
  
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt?.toISOString() || new Date().toISOString(),
    datasetId: run.defaultDatasetId,
  };
}
