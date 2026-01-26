/**
 * Supabase Database Types
 * Type definitions for database tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Log level */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/** Scraper run status */
export type ScraperRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "aborted"
  | "timed_out";

/** Database schema */
export interface Database {
  public: {
    Tables: {
      scraper_runs: {
        Row: {
          id: string;
          run_id: string;
          actor_id: string;
          actor_name: string;
          status: ScraperRunStatus;
          started_at: string;
          finished_at: string | null;
          items_count: number;
          duration_ms: number;
          dataset_id: string | null;
          input_config: Json;
          error_message: string | null;
          resurrect_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          actor_id: string;
          actor_name: string;
          status?: ScraperRunStatus;
          started_at?: string;
          finished_at?: string | null;
          items_count?: number;
          duration_ms?: number;
          dataset_id?: string | null;
          input_config?: Json;
          error_message?: string | null;
          resurrect_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          run_id?: string;
          actor_id?: string;
          actor_name?: string;
          status?: ScraperRunStatus;
          started_at?: string;
          finished_at?: string | null;
          items_count?: number;
          duration_ms?: number;
          dataset_id?: string | null;
          input_config?: Json;
          error_message?: string | null;
          resurrect_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      telegram_members: {
        Row: {
          id: string;
          run_id: string | null;
          created_at: string;
          source_url: string;
          processor: string | null;
          processed_at: string | null;
          telegram_id: string;
          first_name: string | null;
          last_name: string | null;
          usernames: string[] | null;
          phone: string | null;
          type: string;
          is_deleted: boolean;
          is_verified: boolean;
          is_premium: boolean;
          is_scam: boolean;
          is_fake: boolean;
          is_restricted: boolean;
          lang_code: string | null;
          last_seen: string | null;
          stories_hidden: boolean;
          premium_contact: boolean;
        };
        Insert: {
          id?: string;
          run_id?: string | null;
          created_at?: string;
          source_url: string;
          processor?: string | null;
          processed_at?: string | null;
          telegram_id: string;
          first_name?: string | null;
          last_name?: string | null;
          usernames?: string[] | null;
          phone?: string | null;
          type?: string;
          is_deleted?: boolean;
          is_verified?: boolean;
          is_premium?: boolean;
          is_scam?: boolean;
          is_fake?: boolean;
          is_restricted?: boolean;
          lang_code?: string | null;
          last_seen?: string | null;
          stories_hidden?: boolean;
          premium_contact?: boolean;
        };
        Update: {
          id?: string;
          run_id?: string | null;
          created_at?: string;
          source_url?: string;
          processor?: string | null;
          processed_at?: string | null;
          telegram_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          usernames?: string[] | null;
          phone?: string | null;
          type?: string;
          is_deleted?: boolean;
          is_verified?: boolean;
          is_premium?: boolean;
          is_scam?: boolean;
          is_fake?: boolean;
          is_restricted?: boolean;
          lang_code?: string | null;
          last_seen?: string | null;
          stories_hidden?: boolean;
          premium_contact?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      scraper_run_status: ScraperRunStatus;
    };
  };
}

/** Type helpers */
export type ScraperRun = Database["public"]["Tables"]["scraper_runs"]["Row"];
export type ScraperRunInsert = Database["public"]["Tables"]["scraper_runs"]["Insert"];
export type ScraperRunUpdate = Database["public"]["Tables"]["scraper_runs"]["Update"];

export type TelegramMemberRow = Database["public"]["Tables"]["telegram_members"]["Row"];
export type TelegramMemberInsert = Database["public"]["Tables"]["telegram_members"]["Insert"];
export type TelegramMemberUpdate = Database["public"]["Tables"]["telegram_members"]["Update"];
