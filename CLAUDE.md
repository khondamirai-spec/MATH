# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Logika AI is a math puzzle game platform built with Next.js 16, React 19, and Supabase. It features 11 unique games across three categories (Math Puzzles, Memory Games, Brain Training) with a gamification system that tracks scores and awards gems.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The dev server runs on `http://localhost:3000`.

## Environment Setup

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these are missing, the app runs in offline mode with a mock Supabase client (see `src/lib/supabase.ts`).

## Architecture

### User Session Management

The app uses a **guest-first approach** - users don't need to authenticate:

1. On first visit, `initializeUserSession()` checks for:
   - `user_id` in URL query params (from main platform)
   - `user_id` in localStorage
   - If neither exists, generates a new UUID for the guest user

2. User IDs are stored in localStorage as `user_id` for persistent tracking across sessions

3. Sessions are tracked in the `user_game_sessions` table with `session_start`, `last_active`, and optional `session_end` timestamps

**Key file**: `src/lib/userSession.ts`

### Gamification System

The scoring system follows these rules:

- **New high score**: `gems_earned = new_score - old_highest_score`
- **First time playing**: `gems_earned = new_score`
- **No improvement**: `gems_earned = 0`

All score updates use the database function `update_score_and_gems(p_user_id, p_minigame_id, p_new_score)` which atomically:
1. Updates or creates user_game_progress record
2. Calculates gems earned
3. Updates user_wallet total_gems
4. Returns gems earned

**Key file**: `src/lib/gamification.ts`

### Game Name to Database Code Mapping

Game titles displayed in the UI must be mapped to database codes. The mapping is defined in `GAME_NAME_TO_CODE` in `src/lib/gamification.ts`:

```typescript
{
  "Kalkulyator": "calculator",
  "Belgini top": "find_operator",
  "To'g'ri javob": "missing_number",
  // ... etc
}
```

When saving scores, always:
1. Get the game code from `GAME_NAME_TO_CODE[gameName]`
2. Fetch the minigame UUID with `getMinigameIdByCode(code)`
3. Call `updateScoreAndGems(userId, minigameId, score)`

### Database Schema

**Core tables**:
- `minigames` - 11 games with unique codes and names
- `minigame_levels` - 3 difficulty levels per game (number ranges, question counts)
- `user_game_progress` - User's highest score for each game
- `user_wallet` - Total gems accumulated by user
- `user_game_sessions` - Session tracking for analytics

**RLS (Row Level Security)**: Enabled on all tables with policies allowing guest users (unauthenticated) full CRUD access since this is a guest-first app.

**Migrations**: Located in `supabase/migrations/` - apply in order (001 through 007).

### Game Component Architecture

All 11 game components follow a similar pattern:

1. **Initialization**: Call `initializeUserSession()` to get/create user_id
2. **Level Loading**: Fetch level config from `minigame_levels` table via Supabase
3. **Game Logic**: Generate questions based on level's `number_range_min/max`
4. **Score Tracking**: On game end, call `updateScoreAndGems()` with final score
5. **Feedback**: Show gems earned and provide "Play Again" option

**Example**: See `src/components/puzzle/CalculatorGame.tsx` for reference implementation.

### Page Structure

- `/` - Homepage with gem counter and three category links
- `/math-puzzle` - Shows 4 math game cards with scores
- `/memory-puzzle` - Shows 4 memory game cards with scores
- `/train-your-brain` - Shows 3 brain training game cards with scores
- `/debug-scores` - Debug dashboard showing all user scores and user_id
- `/ustoz-coin` - Gem transfer page (future feature)

Each puzzle category page uses `PuzzlePage` component which:
- Fetches user's game records on mount
- Displays game cards with high scores as `💎 {score}`
- Opens game component in modal/overlay on play button click

**Key file**: `src/components/puzzle/PuzzlePage.tsx`

## Key Patterns

### Adding a New Game

1. Create game component in `src/components/puzzle/YourGame.tsx`
2. Add entry to `GAME_NAME_TO_CODE` in `src/lib/gamification.ts`
3. Insert game record into `minigames` table with matching code
4. Insert 3 level configs into `minigame_levels` table
5. Add game to appropriate category page's modes array

### Fetching User Scores

```typescript
import { getUserGameRecords } from '@/lib/gamification';
const records = await getUserGameRecords(userId);
// Returns: { "Kalkulyator": 150, "Belgini top": 200, ... }
```

### Saving Game Scores

```typescript
import { updateScoreAndGems, getMinigameIdByCode, GAME_NAME_TO_CODE } from '@/lib/gamification';

const gameName = "Kalkulyator";
const code = GAME_NAME_TO_CODE[gameName];
const minigameId = await getMinigameIdByCode(code);
const gemsEarned = await updateScoreAndGems(userId, minigameId, finalScore);
```

## Important Notes

- Game names in `GAME_NAME_TO_CODE` must exactly match the `name` field in the `minigames` database table
- All game components use client-side rendering (`"use client"`)
- Sound effects use Web Audio API (fails silently if unsupported)
- The app is multilingual (UI text is in Uzbek/Russian)
- Tailwind v4 is used for styling with custom CSS variables
- Vercel Analytics is integrated for tracking page views
