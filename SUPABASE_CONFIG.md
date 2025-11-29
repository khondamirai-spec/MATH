# Supabase Configuration

## Project Details
- **Project Name:** math
- **Project ID:** bdulysdmqogxcxjopxrj
- **Region:** ap-southeast-1
- **Status:** ACTIVE_HEALTHY

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bdulysdmqogxcxjopxrj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkdWx5c2RtcW9neGN4am9weHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzOTk5NDUsImV4cCI6MjA3OTk3NTk0NX0.6vwzib3OTNHcx7ZNl4O2H8DVsQ_59Xb33JYVcsElrtU
```

## Database Tables

### ✅ user_game_sessions (Created & Secured)
- **RLS Enabled:** Yes
- **Policies:** 
  - Users can insert their own sessions
  - Users can view their own sessions
  - Users can update their own sessions

### Other Tables (Existing)
- mini_games
- questions
- user_game_progress
- user_question_stats
- user_wallet

## Migrations Applied

1. ✅ `002_create_user_game_sessions.sql` - Created table with indexes and triggers
2. ✅ `enable_rls_user_game_sessions` - Enabled RLS and created policies

## Security Status

✅ **user_game_sessions** - RLS enabled and secured
⚠️ Other tables still need RLS enabled (not part of this task)

## Testing

You can test the session creation by:
1. Visiting: `https://math.khondamir.com/?user_id=550e8400-e29b-41d4-a716-446655440000`
2. Check Supabase dashboard to see the session record
3. Check browser localStorage for stored `user_id`

