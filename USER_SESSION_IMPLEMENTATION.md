# User Session Implementation Guide

This document contains all the code sections for implementing user session tracking with Supabase.

---

## 📦 1. SQL Migration

**File:** `supabase/migrations/002_create_user_game_sessions.sql`

```sql
-- =====================================================
-- User Game Sessions Table
-- Tracks user sessions for game tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS user_game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    game_source TEXT NOT NULL DEFAULT 'math',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_user_id ON user_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_last_active ON user_game_sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_game_sessions_game_source ON user_game_sessions(game_source);

-- Trigger for updated_at
CREATE TRIGGER update_user_game_sessions_updated_at
    BEFORE UPDATE ON user_game_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_game_sessions IS 'Tracks user game sessions with start/end times and activity';
```

---

## 🔧 2. Supabase Client Setup

**File:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Environment Variables Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🎯 3. User Session Handler (TypeScript)

**File:** `src/lib/userSession.ts`

This file contains all the logic for:
- Reading `user_id` from URL query parameters
- Validating UUID format
- Storing in localStorage
- Creating/updating Supabase sessions
- Redirecting to main platform if invalid

**Key Functions:**
- `initializeUserSession()` - Main entry point, handles full flow
- `createOrUpdateUserSession()` - Creates or updates session in Supabase
- `getUserIdFromQuery()` - Extracts user_id from URL
- `getUserIdFromStorage()` - Gets user_id from localStorage
- `storeUserIdInStorage()` - Saves user_id to localStorage
- `redirectToMainPlatform()` - Redirects to https://khondamir.com?error=no_user
- `isValidUUID()` - Validates UUID format

---

## 📝 4. Supabase Insert/Update Code

### Option A: Using the Helper Function (Recommended)

```typescript
import { createOrUpdateUserSession } from '@/lib/userSession';

// This automatically:
// - Checks for existing active session
// - Updates last_active if session exists
// - Creates new session if none exists
const { sessionId, error } = await createOrUpdateUserSession(
  userId,      // UUID string
  'math'       // game_source
);

if (error) {
  console.error('Session error:', error);
} else {
  console.log('Session ID:', sessionId);
}
```

### Option B: Direct Supabase Insert

```typescript
import { supabase } from '@/lib/supabase';

// Insert new session
const { data, error } = await supabase
  .from('user_game_sessions')
  .insert({
    user_id: 'abc123-def456-ghi789',  // UUID
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
```

### Option C: Upsert (Insert or Update)

```typescript
import { supabase } from '@/lib/supabase';

// Upsert with conflict resolution
const { data, error } = await supabase
  .from('user_game_sessions')
  .upsert({
    user_id: 'abc123-def456-ghi789',
    last_active: new Date().toISOString(),
    game_source: 'math',
  }, {
    onConflict: 'user_id,game_source',
    ignoreDuplicates: false
  })
  .select()
  .single();
```

### Option D: Update Existing Session

```typescript
import { supabase } from '@/lib/supabase';

// Update last_active timestamp
const { error } = await supabase
  .from('user_game_sessions')
  .update({
    last_active: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', userId)
  .eq('game_source', 'math')
  .is('session_end', null);  // Only update active sessions
```

### Option E: End Session

```typescript
import { supabase } from '@/lib/supabase';

// Mark session as ended
const { error } = await supabase
  .from('user_game_sessions')
  .update({
    session_end: new Date().toISOString(),
    last_active: new Date().toISOString(),
  })
  .eq('id', sessionId);
```

---

## 🚀 5. Integration in Next.js Page

**File:** `src/app/page.tsx` (Updated)

```typescript
"use client";

import { useEffect } from "react";
import { initializeUserSession } from "@/lib/userSession";

export default function Home() {
  useEffect(() => {
    // Initialize user session on mount
    const initSession = async () => {
      const userId = await initializeUserSession('math');
      if (userId) {
        // User is valid, continue with app
        console.log('User session initialized:', userId);
      }
      // If userId is null, redirectToMainPlatform was called
    };

    initSession();
  }, []);

  // ... rest of component
}
```

---

## ✅ 6. Flow Summary

1. **User arrives** at `https://math.khondamir.com/?user_id=abc123`
2. **Page loads** → `useEffect` calls `initializeUserSession()`
3. **Extract user_id** from URL query parameter
4. **Validate** UUID format
5. **If invalid/missing** → Redirect to `https://khondamir.com?error=no_user`
6. **If valid** → Store in localStorage
7. **Check Supabase** for existing active session
8. **Create or update** session in `user_game_sessions` table
9. **Continue** with app functionality

---

## 📋 7. Table Schema Reference

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Primary key, auto-generated |
| `user_id` | UUID | User identifier from main platform |
| `session_start` | TIMESTAMP | When session started (default: NOW()) |
| `session_end` | TIMESTAMP | When session ended (NULL = active) |
| `last_active` | TIMESTAMP | Last activity timestamp (default: NOW()) |
| `game_source` | TEXT | Game identifier (default: 'math') |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time (auto-updated) |

---

## 🔒 8. Security Notes

- UUID validation prevents SQL injection
- Environment variables for Supabase credentials
- localStorage used only for user_id (not sensitive data)
- Redirects to main platform on validation failure
- Supabase RLS policies should be configured separately

---

## 🧪 9. Testing

Test URLs:
- ✅ Valid: `https://math.khondamir.com/?user_id=550e8400-e29b-41d4-a716-446655440000`
- ❌ Invalid: `https://math.khondamir.com/?user_id=invalid`
- ❌ Missing: `https://math.khondamir.com/` (should redirect)

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

Install with:
```bash
npm install @supabase/supabase-js
```

