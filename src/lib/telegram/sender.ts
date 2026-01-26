/**
 * Telegram Message Sender
 * Handles sending messages with error handling and retry logic
 */

import { Api } from 'telegram/tl';
import { getTelegramClient, parseTelegramError, resolveUser } from './client';
import { 
  MessageQueueItem, 
  TelegramMessageResult,
  FloodWaitError,
  UserPrivacyError,
  UserBlockedError,
  TelegramClientError 
} from './types';
import { createClient } from '@/lib/supabase/client';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Sends a message to a Telegram user
 */
export async function sendMessage(
  recipientId: string | number,
  messageText: string,
  recipientUsername?: string
): Promise<TelegramMessageResult> {
  try {
    const client = await getTelegramClient();
    
    // Try username first, then ID
    let identifier = recipientId;
    if (recipientUsername && recipientUsername.trim() !== '') {
      identifier = recipientUsername;
      console.log(`[Sender] Using username: @${recipientUsername}`);
    } else {
      console.log(`[Sender] Using ID: ${recipientId} (no username available)`);
    }
    
    // Try to send directly without resolving first (more reliable)
    try {
      const result = await client.sendMessage(identifier, {
        message: messageText,
      });

      return {
        success: true,
        message_id: result.id,
      };
    } catch (directError: any) {
      // If direct send fails, try resolving first
      console.log(`[Sender] Direct send failed, trying to resolve entity first...`);
      
      const user = await resolveUser(identifier);
      if (!user) {
        return {
          success: false,
          error: {
            code: 'UserNotFound',
            message: `User ${identifier} not found. Your account may need to be a member of the source group.`,
          },
        };
      }

      // Retry with resolved entity
      const result = await client.sendMessage(user, {
        message: messageText,
      });

      return {
        success: true,
        message_id: result.id,
      };
    }
  } catch (error: any) {
    const parsedError = parseTelegramError(error);
    console.error(`Error sending message to ${recipientId}:`, parsedError);

    return {
      success: false,
      error: {
        code: parsedError.code,
        message: parsedError.message,
        wait_seconds: parsedError instanceof FloodWaitError 
          ? parsedError.wait_seconds 
          : undefined,
      },
    };
  }
}

/**
 * Processes a message queue item with retry logic and database updates
 */
export async function processMessageQueueItem(
  item: MessageQueueItem
): Promise<void> {
  const supabase = createClient();
  let attempt = 0;
  let lastError: TelegramClientError | null = null;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    attempt++;

    try {
      console.log(
        `[Sender] Sending message ${item.message_id} to ${item.recipient_username || item.recipient_telegram_id} (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`
      );

      // Send message - pass both ID and username
      const result = await sendMessage(
        item.recipient_telegram_id,
        item.message_text,
        item.recipient_username
      );

      if (result.success) {
        // Update database: mark as sent
        await supabase
          .from('telegram_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            telegram_message_id: result.message_id,
            retry_count: attempt - 1,
          })
          .eq('id', item.message_id);

        console.log(`[Sender] Message ${item.message_id} sent successfully`);
        return; // Success, exit function
      } else {
        // Handle specific errors
        lastError = new TelegramClientError(
          result.error?.message || 'Unknown error',
          result.error?.code as any
        );

        if (result.error?.code === 'FloodWait') {
          // FloodWait error - pause and wait
          const waitSeconds = result.error.wait_seconds || 60;
          console.log(
            `[Sender] FloodWait error. Waiting ${waitSeconds} seconds...`
          );

          await supabase
            .from('telegram_messages')
            .update({
              error_message: `FloodWait: waiting ${waitSeconds}s`,
              error_type: 'FloodWait',
              retry_count: attempt,
            })
            .eq('id', item.message_id);

          // Wait for the specified time
          await new Promise((resolve) => 
            setTimeout(resolve, waitSeconds * 1000)
          );

          // Retry after wait
          continue;
        } else if (
          result.error?.code === 'UserPrivacyRestricted' ||
          result.error?.code === 'UserIsBlocked' ||
          result.error?.code === 'UserNotFound'
        ) {
          // Permanent errors - don't retry
          await supabase
            .from('telegram_messages')
            .update({
              status: 'failed',
              error_message: result.error.message,
              error_type: result.error.code,
              retry_count: attempt,
            })
            .eq('id', item.message_id);

          console.log(
            `[Sender] Message ${item.message_id} failed permanently: ${result.error.code}`
          );
          return; // Permanent failure, exit function
        } else {
          // Temporary error - retry after delay
          console.log(
            `[Sender] Temporary error for message ${item.message_id}: ${result.error?.message}`
          );

          await supabase
            .from('telegram_messages')
            .update({
              error_message: result.error?.message,
              error_type: result.error?.code,
              retry_count: attempt,
            })
            .eq('id', item.message_id);

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    } catch (error: any) {
      console.error(`[Sender] Unexpected error processing message ${item.message_id}:`, error);
      lastError = parseTelegramError(error);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // Max retries reached - mark as failed
  await supabase
    .from('telegram_messages')
    .update({
      status: 'failed',
      error_message: lastError?.message || 'Max retries exceeded',
      error_type: lastError?.code || 'UnknownError',
      retry_count: MAX_RETRY_ATTEMPTS,
    })
    .eq('id', item.message_id);

  console.log(
    `[Sender] Message ${item.message_id} failed after ${MAX_RETRY_ATTEMPTS} attempts`
  );
}

/**
 * Sends messages in bulk using queue
 */
export async function sendBulkMessages(
  items: MessageQueueItem[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  let sent = 0;
  let failed = 0;
  const total = items.length;

  for (const item of items) {
    try {
      await processMessageQueueItem(item);
      
      // Check if it was marked as sent
      const supabase = createClient();
      const { data } = await supabase
        .from('telegram_messages')
        .select('status')
        .eq('id', item.message_id)
        .single();

      if (data?.status === 'sent') {
        sent++;
      } else {
        failed++;
      }

      // Call progress callback
      if (onProgress) {
        onProgress(sent + failed, total);
      }
    } catch (error) {
      console.error(`Error processing item ${item.message_id}:`, error);
      failed++;
    }
  }

  return { sent, failed, total };
}

/**
 * Validates if a user can receive messages
 */
export async function canSendToUser(
  recipientId: string | number
): Promise<{
  canSend: boolean;
  reason?: string;
}> {
  try {
    const user = await resolveUser(recipientId);
    
    if (!user) {
      return {
        canSend: false,
        reason: 'User not found',
      };
    }

    // Check if user is deleted
    if (user.deleted) {
      return {
        canSend: false,
        reason: 'User account is deleted',
      };
    }

    // Check if bot (optional check)
    if (user.bot) {
      return {
        canSend: false,
        reason: 'Cannot send to bots',
      };
    }

    return { canSend: true };
  } catch (error) {
    return {
      canSend: false,
      reason: 'Error validating user',
    };
  }
}

/**
 * Sends a test message to verify setup
 */
export async function sendTestMessage(
  recipientId: string | number,
  message?: string
): Promise<TelegramMessageResult> {
  const testMessage = message || 'This is a test message from DemonOS Telegram System.';
  return await sendMessage(recipientId, testMessage);
}

/**
 * Gets message sending statistics
 */
export async function getMessageStats(campaignId: string): Promise<{
  total: number;
  sent: number;
  pending: number;
  failed: number;
  replied: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_messages')
    .select('status')
    .eq('campaign_id', campaignId);

  if (error) {
    throw new Error(`Failed to get message stats: ${error.message}`);
  }

  const stats = {
    total: data.length,
    sent: 0,
    pending: 0,
    failed: 0,
    replied: 0,
  };

  data.forEach((msg) => {
    switch (msg.status) {
      case 'sent':
        stats.sent++;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'replied':
        stats.replied++;
        break;
    }
  });

  return stats;
}

/**
 * Retries failed messages for a campaign
 */
export async function retryFailedMessages(
  campaignId: string
): Promise<number> {
  const supabase = createClient();

  // Get failed messages
  const { data: failedMessages, error } = await supabase
    .from('telegram_messages')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
    .lt('retry_count', MAX_RETRY_ATTEMPTS);

  if (error) {
    throw new Error(`Failed to get failed messages: ${error.message}`);
  }

  if (!failedMessages || failedMessages.length === 0) {
    return 0;
  }

  // Reset status to pending for retry
  const messageIds = failedMessages.map((msg) => msg.id);
  await supabase
    .from('telegram_messages')
    .update({
      status: 'pending',
      error_message: null,
      error_type: null,
    })
    .in('id', messageIds);

  return messageIds.length;
}

/**
 * Cancels pending messages for a campaign
 */
export async function cancelPendingMessages(
  campaignId: string
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_messages')
    .update({ status: 'failed', error_message: 'Cancelled by user' })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw new Error(`Failed to cancel messages: ${error.message}`);
  }

  return data?.length || 0;
}
