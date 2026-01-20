/**
 * Apify API Types
 * Type definitions for Apify Actor runs and datasets
 */

/** Actor run status from Apify API */
export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMING-OUT"
  | "TIMED-OUT"
  | "ABORTING"
  | "ABORTED";

/** 
 * Input configuration for bhansalisoft/telegram-group-member-scraper
 * @see https://console.apify.com/actors/hLFj6Ay1gfoDw4MLO
 */
export interface TelegramActorInput {
  /** Target group name - Title or username of group/channel (required) */
  Target_Group: string;
  /** Telegram Auth Token (optional) - For accessing private groups */
  Telegram_Auth_Token?: string;
}

/** Run information from Apify API */
export interface ApifyRun {
  id: string;
  actId: string;
  userId: string;
  actorTaskId: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: ApifyRunStatus;
  statusMessage: string | null;
  isStatusMessageTerminal: boolean | null;
  meta: {
    origin: string;
    clientIp: string;
    userAgent: string;
  };
  stats: {
    inputBodyLen: number;
    restartCount: number;
    resurrectCount: number;
    memAvgBytes: number;
    memMaxBytes: number;
    memCurrentBytes: number;
    cpuAvgUsage: number;
    cpuMaxUsage: number;
    cpuCurrentUsage: number;
    netRxBytes: number;
    netTxBytes: number;
    durationMillis: number;
    runTimeSecs: number;
    metamorph: number;
    computeUnits: number;
  };
  options: {
    build: string;
    timeoutSecs: number;
    memoryMbytes: number;
    diskMbytes: number;
  };
  buildId: string;
  exitCode: number | null;
  defaultKeyValueStoreId: string;
  defaultDatasetId: string;
  defaultRequestQueueId: string;
  buildNumber: string;
  containerUrl: string | null;
  isContainerServerReady: boolean | null;
  gitBranchName: string | null;
  usage: {
    ACTOR_COMPUTE_UNITS: number;
    DATASET_READS: number;
    DATASET_WRITES: number;
    KEY_VALUE_STORE_READS: number;
    KEY_VALUE_STORE_WRITES: number;
    KEY_VALUE_STORE_LISTS: number;
    REQUEST_QUEUE_READS: number;
    REQUEST_QUEUE_WRITES: number;
    DATA_TRANSFER_INTERNAL_GBYTES: number;
    DATA_TRANSFER_EXTERNAL_GBYTES: number;
    PROXY_RESIDENTIAL_TRANSFER_GBYTES: number;
    PROXY_SERPS: number;
  };
  usageTotalUsd: number;
  usageUsd: {
    ACTOR_COMPUTE_UNITS: number;
    DATASET_READS: number;
    DATASET_WRITES: number;
    KEY_VALUE_STORE_READS: number;
    KEY_VALUE_STORE_WRITES: number;
    KEY_VALUE_STORE_LISTS: number;
    REQUEST_QUEUE_READS: number;
    REQUEST_QUEUE_WRITES: number;
    DATA_TRANSFER_INTERNAL_GBYTES: number;
    DATA_TRANSFER_EXTERNAL_GBYTES: number;
    PROXY_RESIDENTIAL_TRANSFER_GBYTES: number;
    PROXY_SERPS: number;
  };
}

/** Simplified run info for frontend */
export interface ScraperRunInfo {
  id: string;
  actorId: string;
  status: ApifyRunStatus;
  startedAt: string;
  finishedAt: string | null;
  itemsCount: number;
  durationMs: number;
  datasetId: string;
  errorMessage: string | null;
}

/** Telegram member data from the scraper - matches Apify output */
export interface TelegramMember {
  /** Telegram group URL where the user was found */
  source_url: string;
  /** URL of the Apify actor that processed this data */
  processor: string;
  /** ISO 8601 formatted timestamp (UTC) when the data was processed */
  processed_at: string;
  /** Telegram user unique identifier */
  id: string;
  /** User's first name */
  first_name: string | null;
  /** User's last name */
  last_name: string | null;
  /** List of user's active and historical usernames */
  usernames: string[];
  /** User's phone number if publicly visible or accessible */
  phone: string | null;
  /** Classification of the entity (User vs Bot) */
  type: string;
  /** Whether the user account has been deleted */
  is_deleted: boolean;
  /** Whether the user is officially verified by Telegram */
  is_verified: boolean;
  /** Whether the user has an active Telegram Premium subscription */
  is_premium: boolean;
  /** Whether the user is flagged by Telegram as a scammer */
  is_scam: boolean;
  /** Whether the user is flagged by Telegram as a fake account */
  is_fake: boolean;
  /** Whether the user account is restricted in certain jurisdictions */
  is_restricted: boolean;
  /** User's preferred interface language code */
  lang_code: string | null;
  /** Activity status (Online, timestamps, or duration categories) */
  last_seen: string | null;
  /** Whether the user's stories are hidden from public view */
  stories_hidden: boolean;
  /** Whether contacting this user requires a premium account */
  premium_contact: boolean;
}

/** Dataset item wrapper */
export interface DatasetItem<T = TelegramMember> {
  data: T;
}

/** Paginated dataset response */
export interface DatasetResponse<T = TelegramMember> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/** Actor information */
export interface ApifyActor {
  id: string;
  userId: string;
  name: string;
  username: string;
  description: string | null;
  restartOnError: boolean;
  isPublic: boolean;
  createdAt: string;
  modifiedAt: string;
  stats: {
    totalBuilds: number;
    totalRuns: number;
    totalUsers: number;
    totalUsers7Days: number;
    totalUsers30Days: number;
    totalUsers90Days: number;
    lastRunStartedAt: string;
  };
  versions: {
    versionNumber: string;
    buildTag: string;
    envVars: unknown[];
  }[];
  defaultRunOptions: {
    build: string;
    timeoutSecs: number;
    memoryMbytes: number;
  };
  exampleRunInput: {
    body: string;
    contentType: string;
  } | null;
  isDeprecated: boolean;
  deploymentKey: string | null;
  title: string | null;
  taggedBuilds: Record<string, { buildId: string; buildNumber: string }>;
}

/** API error response */
export interface ApifyError {
  error: {
    type: string;
    message: string;
  };
}

/** Logs response */
export interface ApifyLogs {
  data: string;
}
