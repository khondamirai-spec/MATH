import { supabase } from './supabase';

const MAIN_PLATFORM_URL = 'https://ustoz.ai';
const USER_ID_STORAGE_KEY = 'user_id';

/**
 * Validates if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Gets user_id from URL query parameters
 */
export function getUserIdFromQuery(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('user_id');
}

/**
 * Gets user_id from localStorage
 */
export function getUserIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  return localStorage.getItem(USER_ID_STORAGE_KEY);
}

/**
 * Stores user_id in localStorage
 */
export function storeUserIdInStorage(userId: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(USER_ID_STORAGE_KEY, userId);
}

/**
 * Redirects to main platform with error
 */
export function redirectToMainPlatform(error?: string): void {
  if (typeof window === 'undefined') return;
  
  const errorParam = error ? `?error=${encodeURIComponent(error)}` : '';
  window.location.href = `${MAIN_PLATFORM_URL}${errorParam}`;
}

/**
 * Creates or updates a user game session in Supabase
 */
export async function createOrUpdateUserSession(
  userId: string,
  gameSource: string = 'math'
): Promise<{ sessionId: string | null; error: Error | null }> {
  try {
    // Check if there's an active session (no session_end)
    const { data: activeSession, error: fetchError } = await supabase
      .from('user_game_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('game_source', gameSource)
      .is('session_end', null)
      .order('session_start', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, we'll create a new session
      throw fetchError;
    }

    if (activeSession) {
      // Update existing active session
      const { data: updatedSession, error: updateError } = await supabase
        .from('user_game_sessions')
        .update({
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id)
        .select('id')
        .single();

      if (updateError) throw updateError;

      return { sessionId: updatedSession?.id || null, error: null };
    } else {
      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('user_game_sessions')
        .insert({
          user_id: userId,
          session_start: new Date().toISOString(),
          last_active: new Date().toISOString(),
          game_source: gameSource,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      return { sessionId: newSession?.id || null, error: null };
    }
  } catch (error) {
    // Better error logging for debugging
    if (error instanceof Error) {
      console.error('Error creating/updating user session:', error.message, error);
    } else {
      console.error('Error creating/updating user session:', JSON.stringify(error), error);
    }
    return {
      sessionId: null,
      error: error instanceof Error ? error : new Error(String(error || 'Unknown error')),
    };
  }
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Main function to handle user_id from URL and initialize session
 * Returns the user_id if valid, null if invalid (and redirects in production)
 */
export async function initializeUserSession(
  gameSource: string = 'math'
): Promise<string | null> {
  // Try to get user_id from URL first
  let userId = getUserIdFromQuery();

  // If not in URL, try localStorage
  if (!userId) {
    userId = getUserIdFromStorage();
  }

  // If still no user_id, GENERATE ONE (Guest Mode) instead of redirecting
  if (!userId) {
    // Generate a random UUID for the new user
    userId = crypto.randomUUID();
    console.log('✨ New visitor: Generated guest User ID:', userId);
  }

  // Validate UUID format
  if (!isValidUUID(userId)) {
    // If the ID in storage/URL is invalid, generate a new one
    console.warn('⚠️ Invalid UUID found, generating new one');
    userId = crypto.randomUUID();
  }

  // Store in localStorage for future visits
  storeUserIdInStorage(userId);

  // Create or update session in Supabase
  const { error } = await createOrUpdateUserSession(userId, gameSource);
  
  if (error) {
    console.error('Failed to create/update session:', error);
    // Don't redirect on Supabase errors, just log them
    // User can still use the app
  }

  return userId;
}

