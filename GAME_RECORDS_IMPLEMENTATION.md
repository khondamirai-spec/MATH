# Game Records Implementation

## Overview
The game records system is **fully implemented and working**. Each user's highest score for each game is automatically tracked and displayed.

## How It Works

### 1. Database Structure
- **minigames** table: Stores all 11 games with their codes and names
- **user_game_progress** table: Tracks each user's highest score per game
- **user_wallet** table: Tracks user's total gems earned

### 2. Frontend Display
Each puzzle page (math-puzzle, memory-puzzle, train-your-brain) automatically:
1. Fetches user game records when the page loads
2. Updates the score display for each game mode
3. Shows the score as `💎 {score}` on each game card

### 3. Score Tracking
When a user completes a game:
- The score is saved to the database
- If it's a new high score, user earns gems = (new score - old score)
- The display updates to show the new high score

## Current Data (Example User)

User ID: `1e4659d1-5176-42f0-b477-17169f9cf2ec`

Game Records:
- **Kalkulyator**: 💎 10
- **Belgini top**: 💎 19
- **To'g'ri javob**: 💎 7
- **Tez hisoblash**: 💎 2
- **Og'zaki hisob**: 💎 6

## Files Involved

### Database Files
- `supabase/migrations/007_create_minigames_and_levels.sql` - Creates tables and inserts game data

### Frontend Files
- `src/lib/gamification.ts` - Core functions for tracking scores
  - `getUserGameRecords(userId)` - Fetches all user scores
  - `updateScoreAndGems(userId, minigameId, score)` - Saves new scores
  - `getUserGems(userId)` - Gets total gems
  
- `src/app/math-puzzle/page.tsx` - Math puzzle games page
- `src/app/memory-puzzle/page.tsx` - Memory puzzle games page  
- `src/app/train-your-brain/page.tsx` - Brain training games page
- `src/components/puzzle/PuzzlePage.tsx` - Displays game cards with scores

### Game Components
Each game component (e.g., `CalculatorGame.tsx`) saves scores automatically:
```typescript
const saveScore = useCallback(async () => {
  if (score > 0) {
    const userId = await initializeUserSession('math');
    if (userId) {
      const minigameId = await getMinigameIdByCode("calculator");
      if (minigameId) {
        await updateScoreAndGems(userId, minigameId, score);
      }
    }
  }
}, [score]);
```

## Game Name Mapping

Frontend Game Names (displayed) → Database Codes:
- Kalkulyator → calculator
- Belgini top → find_operator
- To'g'ri javob → missing_number
- Tez hisoblash → fast_calc
- Og'zaki hisob → mental_sequence
- Juftlikni top → matching_cards
- Tez plitalar → math_grid
- Kvadrat ildiz → square_root
- Kunlik vazifa → picture_equation
- Mantiqiy to'r → magic_triangle
- Tez fikrlash → number_pyramid

## How Scores Are Displayed

In `PuzzlePage.tsx` (line 130):
```tsx
<span className="math-score-value">💎 {mode.score}</span>
```

The score is fetched and updated in each puzzle page:
```typescript
useEffect(() => {
  if (activeGame) return;

  const fetchScores = async () => {
    const userId = await initializeUserSession('math');
    if (userId) {
      const records = await getUserGameRecords(userId);
      setModes(prevModes => prevModes.map(mode => ({
        ...mode,
        score: records[mode.title] || 0
      })));
    }
  };

  fetchScores();
}, [activeGame]);
```

## Troubleshooting

If scores show as "💎 0":

1. **Check Browser Console** - Open DevTools (F12) and look for errors
2. **Verify User ID** - Check localStorage for `user_id` key
3. **Check Network Tab** - Look for Supabase API calls to `user_game_progress`
4. **Clear Cache** - Try clearing browser cache and localStorage
5. **Play a Game** - Complete at least one game to generate a score

## Testing

To test the system:
1. Open the app in your browser
2. Navigate to any puzzle page (math/memory/train)
3. Play a game and complete it
4. Go back to the puzzle selection page
5. Your score should be displayed as `💎 {score}` on that game's card
6. Play again and beat your score - you'll earn more gems!

## Database Verification

To check if scores are being saved, run this SQL query in Supabase:
```sql
SELECT 
  ugp.user_id,
  m.name as game_name,
  ugp.highest_score,
  ugp.last_updated
FROM user_game_progress ugp
JOIN minigames m ON ugp.minigame_id = m.id
ORDER BY ugp.last_updated DESC;
```

## Next Steps

The system is working correctly. If you're seeing "💎 0":
- It means you haven't played that game yet, OR
- There might be a different user_id in your browser session

To see your scores, make sure you're logged in and have played the games at least once!

