/**
 * Telegram Campaign Worker
 * Processes message queues and sends messages in background
 */

import { createClient } from '@/lib/supabase/client';
import { getQueue, loadPendingMessages } from './queue';
import { processMessageQueueItem } from './sender';
import { autoStartListener } from './listener';
import { WorkerStatus } from './types';

let workerStatus: WorkerStatus = {
  is_running: false,
  messages_processed: 0,
};

let workerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the worker to process campaign queues
 */
export async function startWorker(): Promise<void> {
  if (workerStatus.is_running) {
    console.log('[Worker] Already running');
    return;
  }

  console.log('[Worker] Starting...');
  workerStatus.is_running = true;
  workerStatus.start_time = new Date().toISOString();
  workerStatus.messages_processed = 0;

  // Start response listener
  try {
    await autoStartListener();
  } catch (error) {
    console.error('[Worker] Failed to start listener:', error);
  }

  // Check for active campaigns and process them
  await processActiveCampaigns();

  // Set up interval to check for new work
  workerInterval = setInterval(async () => {
    await processActiveCampaigns();
  }, 30000); // Check every 30 seconds

  console.log('[Worker] Started successfully');
}

/**
 * Stops the worker
 */
export function stopWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }

  workerStatus.is_running = false;
  workerStatus.campaign_id = undefined;
  workerStatus.current_message = undefined;

  console.log('[Worker] Stopped');
}

/**
 * Gets current worker status
 */
export function getWorkerStatus(): WorkerStatus {
  return { ...workerStatus };
}

/**
 * Processes all active campaigns
 */
async function processActiveCampaigns(): Promise<void> {
  const supabase = createClient();

  // Get active campaigns
  const { data: campaigns, error } = await supabase
    .from('telegram_campaigns')
    .select('id, name, rate_limit_config')
    .eq('status', 'active');

  if (error) {
    console.error('[Worker] Error fetching active campaigns:', error);
    return;
  }

  if (!campaigns || campaigns.length === 0) {
    return;
  }

  console.log(`[Worker] Processing ${campaigns.length} active campaign(s)`);

  // Process each campaign
  for (const campaign of campaigns) {
    try {
      await processCampaign(campaign.id, campaign.rate_limit_config);
    } catch (error) {
      console.error(`[Worker] Error processing campaign ${campaign.id}:`, error);
    }
  }
}

/**
 * Processes a single campaign
 */
async function processCampaign(
  campaignId: string,
  rateLimitConfig: any
): Promise<void> {
  const supabase = createClient();

  // Load pending messages
  const pendingMessages = await loadPendingMessages(campaignId);

  if (pendingMessages.length === 0) {
    // No pending messages - check if campaign should be completed
    await checkCampaignCompletion(campaignId);
    return;
  }

  console.log(`[Worker] Campaign ${campaignId}: ${pendingMessages.length} pending messages`);

  // Get or create queue for this campaign
  const queue = getQueue(campaignId, rateLimitConfig);

  // Add messages to queue
  for (const message of pendingMessages) {
    await queue.add(message, async (item) => {
      workerStatus.campaign_id = campaignId;
      workerStatus.current_message = item.message_id;

      await processMessageQueueItem(item);

      workerStatus.messages_processed++;
      workerStatus.current_message = undefined;
    });
  }

  // Update estimated completion
  const estimatedCompletion = queue.getEstimatedCompletion();
  if (estimatedCompletion) {
    workerStatus.estimated_completion = estimatedCompletion.toISOString();
  }
}

/**
 * Checks if campaign should be marked as completed
 */
async function checkCampaignCompletion(campaignId: string): Promise<void> {
  const supabase = createClient();

  // Get campaign status
  const { data: campaign } = await supabase
    .from('telegram_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (!campaign) return;

  // Check if all messages are processed (sent or failed, none pending)
  if (campaign.messages_pending === 0 && campaign.status === 'active') {
    console.log(`[Worker] Campaign ${campaignId} completed`);

    await supabase
      .from('telegram_campaigns')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
  }
}

/**
 * Manually processes a specific campaign (for testing or manual trigger)
 */
export async function processCampaignManually(
  campaignId: string
): Promise<{
  success: boolean;
  messages_processed: number;
  error?: string;
}> {
  try {
    const supabase = createClient();

    // Get campaign
    const { data: campaign, error } = await supabase
      .from('telegram_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      return {
        success: false,
        messages_processed: 0,
        error: 'Campaign not found',
      };
    }

    // Load pending messages
    const pendingMessages = await loadPendingMessages(campaignId);

    if (pendingMessages.length === 0) {
      return {
        success: true,
        messages_processed: 0,
        error: 'No pending messages',
      };
    }

    // Process messages
    let processed = 0;
    for (const message of pendingMessages) {
      await processMessageQueueItem(message);
      processed++;
    }

    // Check completion
    await checkCampaignCompletion(campaignId);

    return {
      success: true,
      messages_processed: processed,
    };
  } catch (error: any) {
    console.error('[Worker] Error in manual processing:', error);
    return {
      success: false,
      messages_processed: 0,
      error: error.message,
    };
  }
}

/**
 * API route handler for worker control
 */
export async function handleWorkerCommand(
  command: 'start' | 'stop' | 'status' | 'process'
): Promise<any> {
  switch (command) {
    case 'start':
      await startWorker();
      return { success: true, message: 'Worker started' };

    case 'stop':
      stopWorker();
      return { success: true, message: 'Worker stopped' };

    case 'status':
      return { status: getWorkerStatus() };

    case 'process':
      // Trigger immediate processing
      await processActiveCampaigns();
      return { success: true, message: 'Processing triggered' };

    default:
      return { success: false, error: 'Unknown command' };
  }
}

// Auto-start worker if enabled in environment
if (process.env.TELEGRAM_WORKER_ENABLED === 'true') {
  startWorker().catch((error) => {
    console.error('[Worker] Auto-start failed:', error);
  });
}
