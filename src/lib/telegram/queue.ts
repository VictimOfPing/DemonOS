/**
 * Message Queue Manager with Rate Limiting
 * Handles queuing and rate-limited sending of Telegram messages
 */

import PQueue from 'p-queue';
import { 
  MessageQueueItem, 
  QueueStats, 
  RateLimitConfig, 
  RATE_LIMIT_PRESETS 
} from './types';
import { createClient } from '@/lib/supabase/client';

// Global queue instances by campaign ID
const campaignQueues = new Map<string, MessageQueue>();

/**
 * Message Queue class for managing rate-limited message sending
 */
export class MessageQueue {
  private queue: PQueue;
  private config: RateLimitConfig;
  private campaignId: string;
  private messagesSentInBatch: number = 0;
  private isNightMode: boolean = false;
  private isPaused: boolean = false;
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  constructor(campaignId: string, config?: RateLimitConfig) {
    this.campaignId = campaignId;
    this.config = config || RATE_LIMIT_PRESETS.moderate;
    
    // Calculate interval in milliseconds
    const intervalMs = (3600 / this.config.messages_per_hour) * 1000;
    
    this.queue = new PQueue({
      concurrency: 1,
      interval: intervalMs,
      intervalCap: 1,
      autoStart: true,
    });

    // Setup night mode checking
    if (this.config.night_mode_enabled) {
      this.checkNightMode();
      setInterval(() => this.checkNightMode(), 60000); // Check every minute
    }
  }

  /**
   * Checks if current time is within night hours
   */
  private checkNightMode(): void {
    const now = new Date();
    const currentHour = now.getHours();
    const nightStart = this.config.night_start_hour || 23;
    const nightEnd = this.config.night_end_hour || 8;

    // Handle overnight range (e.g., 23:00 - 08:00)
    if (nightStart > nightEnd) {
      this.isNightMode = currentHour >= nightStart || currentHour < nightEnd;
    } else {
      this.isNightMode = currentHour >= nightStart && currentHour < nightEnd;
    }

    if (this.isNightMode && !this.isPaused) {
      console.log(`[Queue ${this.campaignId}] Entering night mode. Pausing queue.`);
      this.pause();
    } else if (!this.isNightMode && this.isPaused && this.config.night_mode_enabled) {
      console.log(`[Queue ${this.campaignId}] Exiting night mode. Resuming queue.`);
      this.resume();
    }
  }

  /**
   * Calculates random delay based on config
   */
  private getRandomDelay(): number {
    const min = this.config.delay_min || 60;
    const max = this.config.delay_max || 80;
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000; // Convert to ms
  }

  /**
   * Checks if batch pause is needed
   */
  private async checkBatchPause(): Promise<void> {
    if (!this.config.pause_after || !this.config.pause_duration) {
      return;
    }

    this.messagesSentInBatch++;

    if (this.messagesSentInBatch >= this.config.pause_after) {
      const pauseMs = this.config.pause_duration * 1000;
      console.log(
        `[Queue ${this.campaignId}] Batch limit reached. Pausing for ${this.config.pause_duration}s`
      );
      
      this.pause();
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
      this.resume();
      
      this.messagesSentInBatch = 0;
    }
  }

  /**
   * Adds a message to the queue
   */
  public async add(
    item: MessageQueueItem,
    handler: (item: MessageQueueItem) => Promise<void>
  ): Promise<void> {
    this.stats.pending++;

    await this.queue.add(async () => {
      this.stats.pending--;
      this.stats.processing++;

      try {
        // Add random delay before sending
        const delay = this.getRandomDelay();
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Execute handler (actual message sending)
        await handler(item);

        this.stats.processing--;
        this.stats.completed++;

        // Check if batch pause is needed
        await this.checkBatchPause();
      } catch (error) {
        this.stats.processing--;
        this.stats.failed++;
        throw error;
      }
    });
  }

  /**
   * Adds multiple messages to the queue
   */
  public async addBulk(
    items: MessageQueueItem[],
    handler: (item: MessageQueueItem) => Promise<void>
  ): Promise<void> {
    for (const item of items) {
      await this.add(item, handler);
    }
  }

  /**
   * Pauses the queue
   */
  public pause(): void {
    this.queue.pause();
    this.isPaused = true;
  }

  /**
   * Resumes the queue
   */
  public resume(): void {
    if (!this.isNightMode) {
      this.queue.start();
      this.isPaused = false;
    }
  }

  /**
   * Clears all pending messages from queue
   */
  public clear(): void {
    this.queue.clear();
    this.stats.pending = 0;
  }

  /**
   * Gets current queue statistics
   */
  public getStats(): QueueStats {
    return {
      ...this.stats,
      pending: this.queue.pending,
    };
  }

  /**
   * Checks if queue is idle (no pending or processing messages)
   */
  public isIdle(): boolean {
    return this.queue.size === 0 && this.queue.pending === 0;
  }

  /**
   * Waits for queue to become idle
   */
  public async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }

  /**
   * Gets estimated completion time
   */
  public getEstimatedCompletion(): Date | null {
    if (this.queue.size === 0) {
      return null;
    }

    const messagesRemaining = this.queue.size + this.queue.pending;
    const avgDelay = (this.config.delay_min + this.config.delay_max) / 2;
    const estimatedSeconds = messagesRemaining * avgDelay;

    // Add pause time if applicable
    let totalPauseTime = 0;
    if (this.config.pause_after && this.config.pause_duration) {
      const numberOfPauses = Math.floor(messagesRemaining / this.config.pause_after);
      totalPauseTime = numberOfPauses * this.config.pause_duration;
    }

    const totalSeconds = estimatedSeconds + totalPauseTime;
    const completionDate = new Date(Date.now() + totalSeconds * 1000);

    return completionDate;
  }

  /**
   * Gets current configuration
   */
  public getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration (takes effect for new messages)
   */
  public updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update queue interval if messages_per_hour changed
    if (newConfig.messages_per_hour) {
      const intervalMs = (3600 / newConfig.messages_per_hour) * 1000;
      // Note: PQueue doesn't support dynamic interval updates
      // For now, log a warning. Full implementation would require recreating the queue.
      console.warn(
        '[Queue] Rate limit updated. Restart queue for changes to take full effect.'
      );
    }
  }
}

/**
 * Gets or creates a queue for a campaign
 */
export function getQueue(
  campaignId: string,
  config?: RateLimitConfig
): MessageQueue {
  if (!campaignQueues.has(campaignId)) {
    const queue = new MessageQueue(campaignId, config);
    campaignQueues.set(campaignId, queue);
  }
  return campaignQueues.get(campaignId)!;
}

/**
 * Removes a queue (cleanup after campaign completion)
 */
export function removeQueue(campaignId: string): void {
  const queue = campaignQueues.get(campaignId);
  if (queue) {
    queue.clear();
    campaignQueues.delete(campaignId);
  }
}

/**
 * Pauses a campaign queue
 */
export function pauseQueue(campaignId: string): void {
  const queue = campaignQueues.get(campaignId);
  if (queue) {
    queue.pause();
  }
}

/**
 * Resumes a campaign queue
 */
export function resumeQueue(campaignId: string): void {
  const queue = campaignQueues.get(campaignId);
  if (queue) {
    queue.resume();
  }
}

/**
 * Gets statistics for a campaign queue
 */
export function getQueueStats(campaignId: string): QueueStats | null {
  const queue = campaignQueues.get(campaignId);
  return queue ? queue.getStats() : null;
}

/**
 * Gets all active campaign queues
 */
export function getActiveCampaigns(): string[] {
  return Array.from(campaignQueues.keys());
}

/**
 * Clears all queues (use with caution)
 */
export function clearAllQueues(): void {
  campaignQueues.forEach((queue) => queue.clear());
  campaignQueues.clear();
}

/**
 * Loads pending messages for a campaign from database
 */
export async function loadPendingMessages(
  campaignId: string
): Promise<MessageQueueItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load pending messages: ${error.message}`);
  }

  return (data || []).map((msg) => ({
    message_id: msg.id,
    campaign_id: msg.campaign_id,
    recipient_telegram_id: msg.recipient_telegram_id,
    recipient_username: msg.recipient_username,
    message_text: msg.message_text,
    retry_count: msg.retry_count,
  }));
}

/**
 * Calculates optimal rate limit based on campaign size
 */
export function calculateOptimalRateLimit(
  totalMessages: number,
  desiredCompletionHours: number = 24
): RateLimitConfig {
  const messagesPerHour = Math.ceil(totalMessages / desiredCompletionHours);

  // Choose preset based on calculated rate
  if (messagesPerHour <= 20) {
    return RATE_LIMIT_PRESETS.conservative;
  } else if (messagesPerHour <= 60) {
    return RATE_LIMIT_PRESETS.moderate;
  } else {
    return RATE_LIMIT_PRESETS.aggressive;
  }
}

/**
 * Estimates campaign duration based on message count and rate limit
 */
export function estimateCampaignDuration(
  messageCount: number,
  config: RateLimitConfig
): {
  hours: number;
  completionDate: Date;
} {
  const avgDelay = (config.delay_min + config.delay_max) / 2;
  const totalDelaySeconds = messageCount * avgDelay;

  // Add pause time
  let totalPauseSeconds = 0;
  if (config.pause_after && config.pause_duration) {
    const numberOfPauses = Math.floor(messageCount / config.pause_after);
    totalPauseSeconds = numberOfPauses * config.pause_duration;
  }

  const totalSeconds = totalDelaySeconds + totalPauseSeconds;
  const hours = totalSeconds / 3600;
  const completionDate = new Date(Date.now() + totalSeconds * 1000);

  return { hours, completionDate };
}
