/**
 * Generic Scraped Data Types
 * Supports any scraper type with flexible data storage
 */

import { z } from "zod";

// =====================================================
// Scraper Types (extend as needed)
// =====================================================

export type ScraperType = 
  | "telegram"
  | "instagram"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "tiktok"
  | "discord"
  | "whatsapp"
  | "custom";

export type EntityType = 
  | "user"
  | "member"
  | "post"
  | "comment"
  | "message"
  | "channel"
  | "group"
  | "profile"
  | "media"
  | "custom";

// =====================================================
// Scraper Configuration
// =====================================================

export interface ScraperConfigInput {
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  label: string;
  placeholder?: string;
  secret?: boolean;
  options?: { value: string; label: string }[];
  default?: string | number | boolean;
}

export interface ScraperConfig {
  id: string;
  scraperType: ScraperType;
  name: string;
  description: string;
  actorId: string;
  platform: string;
  icon: string;
  color: string;
  inputSchema: Record<string, ScraperConfigInput>;
  outputMapping: Record<string, string>;
  isEnabled: boolean;
  isPremium: boolean;
}

// =====================================================
// Scraped Data
// =====================================================

export interface ScrapedDataRecord {
  id: string;
  runId: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Scraper identification
  scraperType: ScraperType;
  scraperActor: string;
  
  // Source identification
  sourceIdentifier: string;
  sourceName: string | null;
  
  // Entity identification
  entityId: string;
  entityType: EntityType;
  entityName: string | null;
  
  // Flexible data
  data: Record<string, unknown>;
  
  // Common indexed fields
  username: string | null;
  displayName: string | null;
  profileUrl: string | null;
  
  // Flags
  isVerified: boolean;
  isPremium: boolean;
  isBot: boolean;
  isSuspicious: boolean;
  isActive: boolean;
}

// Database row format (snake_case)
export interface ScrapedDataRow {
  id: string;
  run_id: string | null;
  created_at: string;
  updated_at: string;
  scraper_type: string;
  scraper_actor: string | null;
  source_identifier: string;
  source_name: string | null;
  entity_id: string;
  entity_type: string;
  entity_name: string | null;
  data: Record<string, unknown>;
  username: string | null;
  display_name: string | null;
  profile_url: string | null;
  is_verified: boolean;
  is_premium: boolean;
  is_bot: boolean;
  is_suspicious: boolean;
  is_active: boolean;
}

// Insert format
export interface ScrapedDataInsert {
  run_id?: string | null;
  scraper_type: string;
  scraper_actor?: string;
  source_identifier: string;
  source_name?: string | null;
  entity_id: string;
  entity_type?: string;
  entity_name?: string | null;
  data: Record<string, unknown>;
  username?: string | null;
  display_name?: string | null;
  profile_url?: string | null;
  is_verified?: boolean;
  is_premium?: boolean;
  is_bot?: boolean;
  is_suspicious?: boolean;
  is_active?: boolean;
}

// =====================================================
// Source Statistics
// =====================================================

export interface SourceStats {
  scraperType: ScraperType;
  sourceIdentifier: string;
  sourceName: string | null;
  recordCount: number;
  premiumCount: number;
  verifiedCount: number;
  botCount: number;
  suspiciousCount: number;
  lastScraped: string;
}

// Database format
export interface SourceStatsRow {
  scraper_type: string;
  source_identifier: string;
  source_name: string | null;
  record_count: number;
  premium_count: number;
  verified_count: number;
  bot_count: number;
  last_scraped: string;
}

// =====================================================
// Summary Statistics
// =====================================================

export interface ScrapedDataSummary {
  scraperType: ScraperType;
  totalRecords: number;
  uniqueSources: number;
  premiumCount: number;
  verifiedCount: number;
  botCount: number;
  suspiciousCount: number;
  lastScraped: string;
}

// =====================================================
// API Schemas
// =====================================================

export const GetScrapedDataSchema = z.object({
  scraperType: z.string().optional(),
  sourceIdentifier: z.string().optional(),
  entityType: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(["created_at", "username", "display_name"]).optional().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type GetScrapedDataRequest = z.infer<typeof GetScrapedDataSchema>;

// =====================================================
// Helpers
// =====================================================

/** Convert database row to frontend format */
export function rowToRecord(row: ScrapedDataRow): ScrapedDataRecord {
  return {
    id: row.id,
    runId: row.run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scraperType: row.scraper_type as ScraperType,
    scraperActor: row.scraper_actor || "",
    sourceIdentifier: row.source_identifier,
    sourceName: row.source_name,
    entityId: row.entity_id,
    entityType: row.entity_type as EntityType,
    entityName: row.entity_name,
    data: row.data,
    username: row.username,
    displayName: row.display_name,
    profileUrl: row.profile_url,
    isVerified: row.is_verified,
    isPremium: row.is_premium,
    isBot: row.is_bot,
    isSuspicious: row.is_suspicious,
    isActive: row.is_active,
  };
}

/** Convert source stats row to frontend format */
export function rowToSourceStats(row: SourceStatsRow): SourceStats {
  return {
    scraperType: row.scraper_type as ScraperType,
    sourceIdentifier: row.source_identifier,
    sourceName: row.source_name,
    recordCount: row.record_count,
    premiumCount: row.premium_count,
    verifiedCount: row.verified_count,
    botCount: row.bot_count,
    suspiciousCount: 0, // Add when available
    lastScraped: row.last_scraped,
  };
}

// =====================================================
// Platform-specific data extractors
// =====================================================

export interface TelegramMemberData {
  user_id: number;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  access_hash?: number;
  phone?: string;
}

export interface InstagramUserData {
  user_id: string;
  username: string;
  full_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  is_private?: boolean;
  profile_pic_url?: string;
}

export interface TwitterUserData {
  user_id: string;
  username: string;
  name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  verified?: boolean;
  profile_image_url?: string;
}

/** Extract common fields from Telegram member data */
export function extractTelegramFields(item: TelegramMemberData): Partial<ScrapedDataInsert> {
  return {
    entity_id: String(item.user_id),
    entity_type: "member",
    username: item.user_name || null,
    display_name: item.first_name || null,
    entity_name: [item.first_name, item.last_name].filter(Boolean).join(" ") || null,
    is_bot: false,
    is_verified: false,
    is_premium: false,
    is_suspicious: false,
    is_active: true,
  };
}

/** Get scraper type display info */
export function getScraperTypeInfo(type: ScraperType): { 
  name: string; 
  icon: string; 
  color: string;
  bgColor: string;
} {
  const info: Record<ScraperType, { name: string; icon: string; color: string; bgColor: string }> = {
    telegram: { name: "Telegram", icon: "📱", color: "#0088cc", bgColor: "bg-[#0088cc]/20" },
    instagram: { name: "Instagram", icon: "📸", color: "#E4405F", bgColor: "bg-[#E4405F]/20" },
    twitter: { name: "Twitter/X", icon: "🐦", color: "#1DA1F2", bgColor: "bg-[#1DA1F2]/20" },
    facebook: { name: "Facebook", icon: "👤", color: "#1877F2", bgColor: "bg-[#1877F2]/20" },
    linkedin: { name: "LinkedIn", icon: "💼", color: "#0A66C2", bgColor: "bg-[#0A66C2]/20" },
    tiktok: { name: "TikTok", icon: "🎵", color: "#000000", bgColor: "bg-black/20" },
    discord: { name: "Discord", icon: "🎮", color: "#5865F2", bgColor: "bg-[#5865F2]/20" },
    whatsapp: { name: "WhatsApp", icon: "💬", color: "#25D366", bgColor: "bg-[#25D366]/20" },
    custom: { name: "Custom", icon: "⚙️", color: "#6B7280", bgColor: "bg-gray-500/20" },
  };
  return info[type] || info.custom;
}
