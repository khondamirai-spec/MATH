/**
 * EXAMPLE: How to use the user session functions
 * 
 * This file demonstrates how to use the user session utilities.
 * You can delete this file after reviewing.
 */

import { 
  initializeUserSession, 
  createOrUpdateUserSession,
  getUserIdFromStorage 
} from './userSession';

// ============================================
// Example 1: Initialize session on page load
// ============================================
// This is already integrated in src/app/page.tsx
// 
// useEffect(() => {
//   const initSession = async () => {
//     const userId = await initializeUserSession('math');
//     if (userId) {
//       // User is valid, continue with app
//     }
//   };
//   initSession();
// }, []);

// ============================================
// Example 2: Manually create/update session
// ============================================
async function exampleCreateSession() {
  const userId = 'abc123-def456-ghi789'; // UUID format
  
  const { sessionId, error } = await createOrUpdateUserSession(
    userId,
    'math' // game_source
  );
  
  if (error) {
    console.error('Session error:', error);
  } else {
    console.log('Session ID:', sessionId);
  }
}

// ============================================
// Example 3: Get stored user_id
// ============================================
function exampleGetStoredUserId() {
  const userId = getUserIdFromStorage();
  if (userId) {
    console.log('Stored user ID:', userId);
  } else {
    console.log('No user ID in storage');
  }
}

// ============================================
// Example 4: Direct Supabase insert (if needed)
// ============================================
import { supabase } from './supabase';

async function exampleDirectInsert() {
  const userId = 'abc123-def456-ghi789';
  
  const { data, error } = await supabase
    .from('user_game_sessions')
    .insert({
      user_id: userId,
      session_start: new Date().toISOString(),
      last_active: new Date().toISOString(),
      game_source: 'math',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Inserted session:', data);
  }
}

// ============================================
// Example 5: Update session (end session)
// ============================================
async function exampleEndSession(sessionId: string) {
  const { error } = await supabase
    .from('user_game_sessions')
    .update({
      session_end: new Date().toISOString(),
      last_active: new Date().toISOString(),
    })
    .eq('id', sessionId);
  
  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Session ended');
  }
}


