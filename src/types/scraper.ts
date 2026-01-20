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
];

/** Request schemas for API validation */
export const RunScraperRequestSchema = z.object({
  scraperId: z.string(),
  /** Target group name or username (e.g., "groupname" or "@groupname" or "https://t.me/groupname") */
  targetGroup: z.string().min(1, "Group name is required"),
  /** Optional auth token for private groups */
  authToken: z.string().optional(),
});

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
