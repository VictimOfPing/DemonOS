/**
 * TypeScript types for Telegram Messaging System
 */

// ========================================
// Database Types
// ========================================

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'replied';

export interface TelegramAuth {
  id: string;
  phone_number: string;
  api_id: string;
  api_hash: string;
  session_string?: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramCampaign {
  id: string;
  name: string;
  description?: string;
  message_template: string;
  target_filter: TargetFilter;
  rate_limit_config: RateLimitConfig;
  status: CampaignStatus;
  total_targets: number;
  messages_sent: number;
  messages_failed: number;
  messages_pending: number;
  responses_received: number;
  created_by?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface TelegramMessage {
  id: string;
  campaign_id: string;
  recipient_telegram_id: string;
  recipient_username?: string;
  recipient_name?: string;
  message_text: string;
  telegram_message_id?: number;
  status: MessageStatus;
  sent_at?: string;
  error_message?: string;
  error_type?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface TelegramResponse {
  id: string;
  message_id: string;
  response_text: string;
  response_telegram_id?: number;
  received_at: string;
  is_read: boolean;
  created_at: string;
}

// ========================================
// Configuration Types
// ========================================

export interface TargetFilter {
  source_groups?: string[]; // Filter by specific Telegram groups
  source_identifiers?: string[]; // Source identifiers from scraped_data
  is_premium?: boolean; // Only premium users
  is_verified?: boolean; // Only verified users
  is_active?: boolean; // Only active users (not deleted)
  is_bot?: boolean; // Include/exclude bots
  exclude_suspicious?: boolean; // Exclude scam/fake accounts
  limit?: number; // Maximum number of targets
  has_username?: boolean; // Only users with username
  has_phone?: boolean; // Only users with phone number
}

export interface RateLimitConfig {
  messages_per_hour: number; // Base rate: 60 = 1 message per minute
  delay_min: number; // Minimum delay in seconds between messages
  delay_max: number; // Maximum delay in seconds (adds randomness)
  pause_after?: number; // Pause after X messages (optional)
  pause_duration?: number; // Pause duration in seconds (optional)
  night_mode_enabled?: boolean; // Stop sending during night hours
  night_start_hour?: number; // Default: 23 (11 PM)
  night_end_hour?: number; // Default: 8 (8 AM)
}

// Preset configurations
export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfig> = {
  conservative: {
    messages_per_hour: 20,
    delay_min: 160,
    delay_max: 200,
    pause_after: 10,
    pause_duration: 600, // 10 minutes
    night_mode_enabled: true,
    night_start_hour: 23,
    night_end_hour: 8,
  },
  moderate: {
    messages_per_hour: 60,
    delay_min: 55,
    delay_max: 75,
    pause_after: 20,
    pause_duration: 300, // 5 minutes
    night_mode_enabled: true,
    night_start_hour: 23,
    night_end_hour: 8,
  },
  aggressive: {
    messages_per_hour: 120,
    delay_min: 28,
    delay_max: 35,
    pause_after: 30,
    pause_duration: 180, // 3 minutes
    night_mode_enabled: false,
  },
};

// ========================================
// API Request/Response Types
// ========================================

export interface AuthInitRequest {
  phone_number: string;
  api_id?: string; // Optional - will be read from ENV if not provided
  api_hash?: string; // Optional - will be read from ENV if not provided
}

export interface AuthInitResponse {
  session_id: string;
  phone_code_hash: string;
  message: string;
}

export interface AuthVerifyRequest {
  session_id: string;
  phone_code: string;
  phone_code_hash?: string; // Code hash from sendCode response
  password?: string; // For 2FA
}

export interface AuthVerifyResponse {
  success: boolean;
  auth_id: string;
  message: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  message_template: string;
  target_filter: TargetFilter;
  rate_limit_preset?: 'conservative' | 'moderate' | 'aggressive';
  rate_limit_config?: RateLimitConfig;
}

export interface CreateCampaignResponse {
  success: boolean;
  campaign: TelegramCampaign;
  estimated_targets: number;
}

export interface StartCampaignRequest {
  campaign_id: string;
}

export interface StartCampaignResponse {
  success: boolean;
  message: string;
  targets_loaded: number;
  estimated_duration_hours: number;
}

export interface CampaignStatsResponse {
  campaign: TelegramCampaign;
  stats: {
    total_targets: number;
    messages_sent: number;
    messages_pending: number;
    messages_failed: number;
    responses_received: number;
    response_rate: number; // Percentage
    avg_send_time?: number; // Average time to send in seconds
    errors_by_type: Record<string, number>;
  };
  recent_messages: TelegramMessage[];
  recent_responses: TelegramResponse[];
}

// ========================================
// Telegram API Types
// ========================================

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone?: string;
  is_bot: boolean;
  is_premium?: boolean;
  is_verified?: boolean;
}

export interface TelegramMessageResult {
  success: boolean;
  message_id?: number;
  error?: TelegramError;
}

export interface TelegramError {
  code: string;
  message: string;
  wait_seconds?: number; // For FloodWait errors
}

export type TelegramErrorType =
  | 'FloodWait'
  | 'UserPrivacyRestricted'
  | 'UserIsBlocked'
  | 'UserNotFound'
  | 'ChatWriteForbidden'
  | 'PeerIdInvalid'
  | 'NetworkError'
  | 'AuthenticationError'
  | 'UnknownError';

// ========================================
// Worker & Queue Types
// ========================================

export interface MessageQueueItem {
  message_id: string; // UUID from telegram_messages table
  campaign_id: string;
  recipient_telegram_id: string;
  recipient_username?: string;
  message_text: string;
  retry_count: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface WorkerStatus {
  is_running: boolean;
  campaign_id?: string;
  current_message?: string;
  messages_processed: number;
  start_time?: string;
  estimated_completion?: string;
}

// ========================================
// View Types (from database views)
// ========================================

export interface CampaignStatsView {
  id: string;
  name: string;
  status: CampaignStatus;
  total_targets: number;
  messages_sent: number;
  messages_failed: number;
  messages_pending: number;
  responses_received: number;
  response_rate_percent: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_hours?: number;
}

export interface MessageWithResponse {
  id: string;
  campaign_id: string;
  campaign_name: string;
  recipient_telegram_id: string;
  recipient_username?: string;
  recipient_name?: string;
  message_text: string;
  status: MessageStatus;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  has_response: boolean;
  response_text?: string;
  response_received_at?: string;
  response_is_read?: boolean;
}

// ========================================
// Utility Types
// ========================================

export interface MessageTemplate {
  text: string;
  variables: string[]; // e.g., ['name', 'username', 'first_name']
}

export function parseMessageTemplate(template: string): MessageTemplate {
  const regex = /{(\w+)}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return { text: template, variables };
}

export function fillMessageTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return data[key] || match;
  });
}

// ========================================
// Error Classes
// ========================================

export class TelegramClientError extends Error {
  constructor(
    message: string,
    public code: TelegramErrorType,
    public originalError?: any
  ) {
    super(message);
    this.name = 'TelegramClientError';
  }
}

export class FloodWaitError extends TelegramClientError {
  constructor(
    message: string,
    public wait_seconds: number
  ) {
    super(message, 'FloodWait');
    this.name = 'FloodWaitError';
  }
}

export class UserPrivacyError extends TelegramClientError {
  constructor(message: string) {
    super(message, 'UserPrivacyRestricted');
    this.name = 'UserPrivacyError';
  }
}

export class UserBlockedError extends TelegramClientError {
  constructor(message: string) {
    super(message, 'UserIsBlocked');
    this.name = 'UserBlockedError';
  }
}
