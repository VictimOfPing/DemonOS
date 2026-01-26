/**
 * Telegram Response Listener
 * Monitors and tracks responses to campaign messages
 */

import { NewMessage, NewMessageEvent } from 'telegram/events';
import { Api } from 'telegram/tl';
import { getTelegramClient } from './client';
import { createClient } from '@/lib/supabase/client';
import { TelegramResponse } from './types';

let listenerActive = false;
let eventHandler: ((event: NewMessageEvent) => Promise<void>) | null = null;

/**
 * Starts the response listener
 * Monitors incoming messages and matches them to sent campaign messages
 */
export async function startResponseListener(): Promise<void> {
  if (listenerActive) {
    console.log('[Listener] Already active');
    return;
  }

  try {
    const client = await getTelegramClient();
    
    // Create event handler
    eventHandler = async (event: NewMessageEvent) => {
      try {
        await handleNewMessage(event);
      } catch (error) {
        console.error('[Listener] Error handling message:', error);
      }
    };

    // Add event handler
    client.addEventHandler(eventHandler, new NewMessage({}));
    
    listenerActive = true;
    console.log('[Listener] Started successfully');
  } catch (error) {
    console.error('[Listener] Failed to start:', error);
    throw error;
  }
}

/**
 * Stops the response listener
 */
export async function stopResponseListener(): Promise<void> {
  if (!listenerActive || !eventHandler) {
    return;
  }

  try {
    const client = await getTelegramClient();
    // Remove event handler with the same event type used when adding
    client.removeEventHandler(eventHandler, new NewMessage({}));
    
    listenerActive = false;
    eventHandler = null;
    console.log('[Listener] Stopped successfully');
  } catch (error) {
    console.error('[Listener] Error stopping listener:', error);
  }
}

/**
 * Checks if listener is currently active
 */
export function isListenerActive(): boolean {
  return listenerActive;
}

/**
 * Handles a new incoming message
 */
async function handleNewMessage(event: NewMessageEvent): Promise<void> {
  const message = event.message;
  
  // Only process private messages (not group messages)
  if (!message.isPrivate) {
    return;
  }

  // Get sender info
  const senderId = message.senderId?.toString();
  if (!senderId) {
    return;
  }

  const messageText = message.text || '';
  const messageId = message.id;

  // Check if this is a reply to one of our sent messages
  const replyToMsgId = message.replyTo?.replyToMsgId;
  
  if (replyToMsgId) {
    // This is a reply - try to match it to our sent messages
    await handleReply(senderId, messageId, replyToMsgId, messageText);
  } else {
    // This might be a direct message in response to our campaign
    // Try to match by sender ID and recent time
    await handleDirectMessage(senderId, messageId, messageText);
  }
}

/**
 * Handles a reply to one of our sent messages
 */
async function handleReply(
  senderId: string,
  replyMessageId: number,
  originalMessageId: number,
  responseText: string
): Promise<void> {
  const supabase = createClient();

  // Find our original message by telegram_message_id and sender
  const { data: sentMessage, error: findError } = await supabase
    .from('telegram_messages')
    .select('id, campaign_id')
    .eq('recipient_telegram_id', senderId)
    .eq('telegram_message_id', originalMessageId)
    .single();

  if (findError || !sentMessage) {
    console.log(
      `[Listener] No matching sent message found for reply from ${senderId}`
    );
    return;
  }

  // Check if response already exists
  const { data: existingResponse } = await supabase
    .from('telegram_responses')
    .select('id')
    .eq('message_id', sentMessage.id)
    .eq('response_telegram_id', replyMessageId)
    .single();

  if (existingResponse) {
    // Response already recorded
    return;
  }

  // Save the response
  const { error: insertError } = await supabase
    .from('telegram_responses')
    .insert({
      message_id: sentMessage.id,
      response_text: responseText,
      response_telegram_id: replyMessageId,
      received_at: new Date().toISOString(),
      is_read: false,
    });

  if (insertError) {
    console.error('[Listener] Error saving response:', insertError);
    return;
  }

  console.log(
    `[Listener] Recorded reply from ${senderId} to campaign ${sentMessage.campaign_id}`
  );
}

/**
 * Handles a direct message that might be a response
 */
async function handleDirectMessage(
  senderId: string,
  messageId: number,
  responseText: string
): Promise<void> {
  const supabase = createClient();

  // Find the most recent sent message to this user
  const { data: sentMessage, error: findError } = await supabase
    .from('telegram_messages')
    .select('id, campaign_id, sent_at')
    .eq('recipient_telegram_id', senderId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single();

  if (findError || !sentMessage) {
    // No recent messages to this user
    return;
  }

  // Check if message was sent recently (within 7 days)
  const sentAt = new Date(sentMessage.sent_at);
  const now = new Date();
  const daysDiff = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff > 7) {
    // Message too old, probably not a response
    return;
  }

  // Check if we already have a response for this message
  const { data: existingResponse } = await supabase
    .from('telegram_responses')
    .select('id')
    .eq('message_id', sentMessage.id)
    .single();

  if (existingResponse) {
    // Already have a response
    return;
  }

  // Save as potential response
  const { error: insertError } = await supabase
    .from('telegram_responses')
    .insert({
      message_id: sentMessage.id,
      response_text: responseText,
      response_telegram_id: messageId,
      received_at: new Date().toISOString(),
      is_read: false,
    });

  if (insertError) {
    console.error('[Listener] Error saving direct message response:', insertError);
    return;
  }

  console.log(
    `[Listener] Recorded direct message from ${senderId} as response to campaign ${sentMessage.campaign_id}`
  );
}

/**
 * Gets unread responses count
 */
export async function getUnreadResponsesCount(): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_responses')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    console.error('[Listener] Error getting unread count:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Marks responses as read
 */
export async function markResponsesAsRead(
  responseIds: string[]
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('telegram_responses')
    .update({ is_read: true })
    .in('id', responseIds);
}

/**
 * Gets recent responses for a campaign
 */
export async function getCampaignResponses(
  campaignId: string,
  limit: number = 50
): Promise<TelegramResponse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_responses')
    .select(`
      *,
      telegram_messages!inner(campaign_id)
    `)
    .eq('telegram_messages.campaign_id', campaignId)
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Listener] Error getting campaign responses:', error);
    return [];
  }

  return data || [];
}

/**
 * Gets all unread responses
 */
export async function getUnreadResponses(
  limit: number = 100
): Promise<TelegramResponse[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('telegram_responses')
    .select('*')
    .eq('is_read', false)
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Listener] Error getting unread responses:', error);
    return [];
  }

  return data || [];
}

/**
 * Auto-starts listener if not already active
 * Call this on application startup
 */
export async function autoStartListener(): Promise<void> {
  if (listenerActive) {
    return;
  }

  try {
    await startResponseListener();
    console.log('[Listener] Auto-started on application startup');
  } catch (error) {
    console.error('[Listener] Failed to auto-start:', error);
  }
}

/**
 * Gets listener status
 */
export function getListenerStatus(): {
  active: boolean;
  uptime?: number;
} {
  return {
    active: listenerActive,
  };
}
