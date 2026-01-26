/**
 * Telegram MTProto Client Wrapper
 * Handles authentication, session management, and client initialization
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { createClient } from '@/lib/supabase/client';
import { 
  TelegramAuth, 
  TelegramClientError, 
  FloodWaitError,
  UserPrivacyError,
  UserBlockedError 
} from './types';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TELEGRAM_ENCRYPTION_KEY || 'default-key-change-in-production';

// Singleton client instance
let clientInstance: TelegramClient | null = null;
let currentAuthId: string | null = null;

/**
 * Encrypts sensitive data before storing in database
 */
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts sensitive data retrieved from database
 */
function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Initializes a new Telegram client with authentication
 * This is step 1 of the authentication process
 */
export async function initializeTelegramClient(
  phoneNumber: string,
  apiId: string,
  apiHash: string
): Promise<{ sessionId: string; phoneCodeHash: string }> {
  try {
    const session = new StringSession('');
    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    // Request phone code
    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phoneNumber
    );

    // Save temporary session in memory (will be completed after verification)
    const sessionString = session.save();
    
    // Store partial auth in database (update if phone number already exists)
    const supabase = createClient();
    const { data: authData, error } = await supabase
      .from('telegram_auth')
      .upsert({
        phone_number: phoneNumber,
        api_id: apiId,
        api_hash: apiHash,
        session_string: encrypt(sessionString),
        is_active: false,
      }, {
        onConflict: 'phone_number'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save auth data: ${error.message}`);
    }

    return {
      sessionId: authData.id,
      phoneCodeHash: result.phoneCodeHash,
    };
  } catch (error: any) {
    console.error('Error initializing Telegram client:', error);
    throw new TelegramClientError(
      `Failed to initialize Telegram client: ${error.message}`,
      'AuthenticationError',
      error
    );
  }
}

/**
 * Verifies phone code and completes authentication
 * This is step 2 of the authentication process
 */
export async function verifyPhoneCode(
  sessionId: string,
  phoneCode: string,
  phoneCodeHash: string,
  password?: string
): Promise<string> {
  try {
    const supabase = createClient();
    
    // Load auth data
    const { data: authData, error: fetchError } = await supabase
      .from('telegram_auth')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !authData) {
      throw new Error('Auth session not found');
    }

    // Create client with stored session
    const sessionString = decrypt(authData.session_string);
    const session = new StringSession(sessionString);
    const client = new TelegramClient(
      session,
      parseInt(authData.api_id),
      authData.api_hash,
      { connectionRetries: 5 }
    );

    await client.connect();

    // Sign in with phone code
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: authData.phone_number,
        phoneCodeHash: phoneCodeHash,
        phoneCode: phoneCode,
      })
    );

    // If 2FA is enabled, handle password
    if (password) {
      const passwordInfo = await client.invoke(
        new Api.account.GetPassword()
      );
      // Use type assertion for computeCheck which may not be in type definitions
      const computedPassword = await (client as unknown as { computeCheck: (info: typeof passwordInfo, pwd: string) => Promise<Api.InputCheckPasswordSRP> }).computeCheck(passwordInfo, password);
      await client.invoke(
        new Api.auth.CheckPassword({
          password: computedPassword,
        })
      );
    }

    // Save completed session
    const completedSessionString = session.save();
    const { error: updateError } = await supabase
      .from('telegram_auth')
      .update({
        session_string: encrypt(completedSessionString),
        is_active: true,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update auth: ${updateError.message}`);
    }

    return sessionId;
  } catch (error: any) {
    console.error('Error verifying phone code:', error);
    throw new TelegramClientError(
      `Failed to verify phone code: ${error.message}`,
      'AuthenticationError',
      error
    );
  }
}

/**
 * Loads and returns active Telegram client
 * Uses singleton pattern to reuse client instance
 */
export async function getTelegramClient(): Promise<TelegramClient> {
  // Return existing client if available
  if (clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  try {
    const supabase = createClient();
    
    // Find active auth
    const { data: authData, error } = await supabase
      .from('telegram_auth')
      .select('*')
      .eq('is_active', true)
      .order('last_used_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !authData) {
      throw new Error('No active Telegram authentication found. Please authenticate first.');
    }

    // Decrypt and load session
    const sessionString = decrypt(authData.session_string);
    const session = new StringSession(sessionString);
    
    const client = new TelegramClient(
      session,
      parseInt(authData.api_id),
      authData.api_hash,
      {
        connectionRetries: 5,
        autoReconnect: true,
      }
    );

    await client.connect();

    // Update last used timestamp
    await supabase
      .from('telegram_auth')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', authData.id);

    clientInstance = client;
    currentAuthId = authData.id;

    return client;
  } catch (error: any) {
    console.error('Error getting Telegram client:', error);
    throw new TelegramClientError(
      `Failed to get Telegram client: ${error.message}`,
      'AuthenticationError',
      error
    );
  }
}

/**
 * Disconnects and clears the client instance
 */
export async function disconnectTelegramClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.disconnect();
    } catch (error) {
      console.error('Error disconnecting Telegram client:', error);
    }
    clientInstance = null;
    currentAuthId = null;
  }
}

/**
 * Checks if client is connected and authenticated
 */
export async function isClientConnected(): Promise<boolean> {
  if (!clientInstance) {
    return false;
  }

  try {
    return clientInstance.connected ?? false;
  } catch {
    return false;
  }
}

/**
 * Gets current authenticated user info
 */
export async function getCurrentUser(): Promise<Api.User | null> {
  try {
    const client = await getTelegramClient();
    const me = await client.getMe();
    return me as Api.User;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Resolves username or user ID to User entity
 */
export async function resolveUser(
  identifier: string | number
): Promise<Api.User | null> {
  try {
    const client = await getTelegramClient();
    const entity = await client.getEntity(identifier);
    
    if (entity instanceof Api.User) {
      return entity;
    }
    
    return null;
  } catch (error) {
    console.error(`Error resolving user ${identifier}:`, error);
    return null;
  }
}

/**
 * Parses Telegram API errors and converts to custom error types
 */
export function parseTelegramError(error: any): TelegramClientError {
  const errorMessage = error.message || error.toString();

  // FloodWait error
  if (errorMessage.includes('FLOOD_WAIT_')) {
    const match = errorMessage.match(/FLOOD_WAIT_(\d+)/);
    const waitSeconds = match ? parseInt(match[1]) : 60;
    return new FloodWaitError(
      `Rate limit exceeded. Wait ${waitSeconds} seconds.`,
      waitSeconds
    );
  }

  // User privacy errors
  if (
    errorMessage.includes('USER_PRIVACY_RESTRICTED') ||
    errorMessage.includes('PRIVACY_')
  ) {
    return new UserPrivacyError('User privacy settings prevent messaging');
  }

  // User blocked bot/user
  if (
    errorMessage.includes('USER_IS_BLOCKED') ||
    errorMessage.includes('BLOCKED')
  ) {
    return new UserBlockedError('User has blocked messages');
  }

  // Peer/user not found
  if (
    errorMessage.includes('PEER_ID_INVALID') ||
    errorMessage.includes('USER_ID_INVALID')
  ) {
    return new TelegramClientError(
      'User not found or invalid',
      'UserNotFound',
      error
    );
  }

  // Chat write forbidden
  if (errorMessage.includes('CHAT_WRITE_FORBIDDEN')) {
    return new TelegramClientError(
      'Cannot write to this chat',
      'ChatWriteForbidden',
      error
    );
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return new TelegramClientError(
      'Network error occurred',
      'NetworkError',
      error
    );
  }

  // Default unknown error
  return new TelegramClientError(
    errorMessage,
    'UnknownError',
    error
  );
}

/**
 * Deactivates current authentication session
 */
export async function deactivateAuth(authId: string): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from('telegram_auth')
    .update({ is_active: false })
    .eq('id', authId);

  // Disconnect if this is the current client
  if (authId === currentAuthId) {
    await disconnectTelegramClient();
  }
}

/**
 * Lists all authentication sessions
 */
export async function listAuthSessions(): Promise<TelegramAuth[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('telegram_auth')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list auth sessions: ${error.message}`);
  }

  return data || [];
}
