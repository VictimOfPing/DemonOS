/**
 * Shared Scraper Types
 * Types used across frontend and backend
 */

import { z } from "zod";

/** Scraper status for UI */
export type ScraperStatus =
  | "idle"
  | "running"
  | "paused"
  | "error"
  | "completed";

/** Map Apify status to UI status */
export function mapApifyStatusToUI(
  apifyStatus: string
): ScraperStatus {
  switch (apifyStatus) {
    case "READY":
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "completed";
    case "FAILED":
    case "TIMED-OUT":
      return "error";
    case "ABORTING":
    case "ABORTED":
      return "idle";
    default:
      return "idle";
  }
}

/** Scraper configuration for UI */
export interface ScraperConfig {
  id: string;
  name: string;
  description: string;
  platform: "telegram" | "facebook" | "whatsapp" | "instagram";
  actorId: string;
  enabled: boolean;
  status: ScraperStatus;
  progress: number;
  itemsScraped: number;
  lastRun: Date | null;
  currentRunId: string | null;
  avgSpeed: number;
  settings: {
    /** Auth token for private groups (optional) */
    authToken?: string;
    /** Max items to scrape (optional) */
    maxItems?: number;
  };
}

/** Available scrapers configuration */
export const AVAILABLE_SCRAPERS: Omit<ScraperConfig, "status" | "progress" | "itemsScraped" | "lastRun" | "currentRunId" | "avgSpeed">[] = [
  {
    id: "telegram",
    name: "Telegram Group Scraper",
    description: "Extract members from Telegram groups and channels. Scrapes hidden members from chat history and member list.",
    platform: "telegram",
    actorId: "bhansalisoft/telegram-group-member-scraper",
    enabled: true,
    settings: {},
  },
  {
    id: "facebook",
    name: "Facebook Group Scraper",
    description: "Extract members from Facebook groups including profile info, contribution scores, and membership details.",
    platform: "facebook",
    actorId: "easyapi/facebook-group-members-scraper",
    enabled: true,
    settings: {},
  },
  {
    id: "instagram",
    name: "Instagram Followers/Following Scraper",
    description: "Export Instagram followers or following lists at scale. No cookies required. Supports multiple usernames in a single run.",
    platform: "instagram",
    actorId: "scraping_solutions/instagram-scraper-followers-following-no-cookies",
    enabled: true,
    settings: {
      maxItems: 200,
    },
  },
];

/** Request schemas for API validation */
export const RunScraperRequestSchema = z.object({
  scraperId: z.string(),
  /** Target group name or username for Telegram (e.g., "groupname" or "@groupname" or "https://t.me/groupname") */
  targetGroup: z.string().optional(),
  /** Optional auth token for private Telegram groups */
  authToken: z.string().optional(),
  /** Facebook group URLs to scrape (array) */
  groupUrls: z.array(z.string()).optional(),
  /** Maximum number of items to scrape (for Facebook and Instagram) */
  maxItems: z.number().min(1).max(1000000).optional(),
  /** Instagram usernames to scrape followers/following from (array) */
  instagramUsernames: z.array(z.string()).optional(),
  /** Type of Instagram scrape: followers or following */
  instagramType: z.enum(["followers", "following"]).optional(),
}).refine(
  (data) => {
    // Telegram requires targetGroup
    if (data.scraperId === "telegram") {
      return !!data.targetGroup && data.targetGroup.length > 0;
    }
    // Facebook requires groupUrls
    if (data.scraperId === "facebook") {
      return !!data.groupUrls && data.groupUrls.length > 0;
    }
    // Instagram requires instagramUsernames
    if (data.scraperId === "instagram") {
      return !!data.instagramUsernames && data.instagramUsernames.length > 0;
    }
    // For unknown scrapers, require at least one input
    return !!data.targetGroup || (!!data.groupUrls && data.groupUrls.length > 0) || (!!data.instagramUsernames && data.instagramUsernames.length > 0);
  },
  {
    message: "Required input not provided based on scraper type",
  }
);

export type RunScraperRequest = z.infer<typeof RunScraperRequestSchema>;

export const AbortScraperRequestSchema = z.object({
  runId: z.string(),
});

export type AbortScraperRequest = z.infer<typeof AbortScraperRequestSchema>;

export const GetDataRequestSchema = z.object({
  runId: z.string().optional(),
  datasetId: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

export type GetDataRequest = z.infer<typeof GetDataRequestSchema>;

/** API Response types */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RunScraperResponse {
  runId: string;
  datasetId: string;
  status: string;
  message: string;
}

export interface ScraperStatusResponse {
  runs: {
    id: string;
    actorId: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    itemsCount: number;
    durationMs: number;
  }[];
}
