# 🎮 Logika AI - Math Puzzle Game Platform

A comprehensive brain training and math puzzle game platform built with Next.js and Supabase. Features 11 unique games across three categories: Math Puzzles, Memory Games, and Brain Training exercises.

## ✨ Features

- 🎯 **11 Unique Games** across three categories
- 💎 **Gamification System** with gems and rewards
- 📊 **Score Tracking** - Automatic high score recording
- 🏆 **Leaderboard System** - Track progress across all games
- 👤 **User Sessions** - Persistent user tracking via localStorage
- 🔍 **Debug Dashboard** - View all scores and user data at `/debug-scores`
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Beautiful UI** - Modern gradients and animations

## 🎮 Game Categories

### Math Puzzles (`/math-puzzle`)
1. **Kalkulyator** - Fast arithmetic calculations
2. **Belgini top** - Find the missing operator
3. **To'g'ri javob** - Choose the correct answer
4. **Tez hisoblash** - Speed calculation challenges

### Memory Games (`/memory-puzzle`)
5. **Og'zaki hisob** - Mental arithmetic sequences
6. **Juftlikni top** - Matching card pairs
7. **Tez plitalar** - Fast grid challenges
8. **Kvadrat ildiz** - Square root calculations

### Brain Training (`/train-your-brain`)
9. **Kunlik vazifa** - Daily picture equations
10. **Mantiqiy to'r** - Magic triangle puzzles
11. **Tez fikrlash** - Lightning-fast thinking

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 💎 Score System

Every game tracks your highest score and displays it as `💎 {score}` on the game card. 

### How It Works
1. Play any game and complete it
2. Your score is automatically saved to the database
3. Go back to the puzzle page - your score now appears!
4. Beat your record to earn more gems: `gems = new_score - old_score`

### View Your Scores
- **On Game Cards**: Each puzzle page shows scores on individual game cards
- **Debug Page**: Visit `/debug-scores` to see all your scores in one place
- **Homepage**: Your total gems are displayed in the top-left corner

## 🔍 Debug Dashboard

Access the debug dashboard at `/debug-scores` to:
- View your User ID
- See all game scores in one list
- Check your total gems
- Understand how the system works
- Quick links to all game pages

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── math-puzzle/page.tsx        # Math games
│   ├── memory-puzzle/page.tsx      # Memory games
│   ├── train-your-brain/page.tsx   # Brain games
│   ├── ustoz-coin/page.tsx         # Gem transfer
│   └── debug-scores/page.tsx       # Debug dashboard
├── components/
│   └── puzzle/
│       ├── PuzzlePage.tsx          # Game card display
│       ├── CalculatorGame.tsx      # Individual games...
│       └── ...                     # 11 game components
└── lib/
    ├── gamification.ts             # Score tracking logic
    ├── userSession.ts              # User management
    └── supabase.ts                 # Database client

supabase/
└── migrations/
    ├── 001_create_math_game_schema.sql
    ├── 002_create_user_game_sessions.sql
    ├── 003_gamification_updates.sql
    ├── 004_enable_rls.sql
    ├── 005_allow_guest_users.sql
    ├── 006_fix_security_definer.sql
    └── 007_create_minigames_and_levels.sql
```

## 🗄️ Database Schema

### Tables
- **minigames** - 11 games with codes and names
- **minigame_levels** - Level configurations (3 per game)
- **user_game_progress** - User high scores per game
- **user_wallet** - Total gems per user
- **user_game_sessions** - Session tracking

### Key Functions
- `update_score_and_gems(user_id, minigame_id, new_score)` - Save scores
- `getUserGameRecords(userId)` - Fetch all user scores
- `getUserGems(userId)` - Get total gems

## 📚 Documentation

- `GAME_RECORDS_IMPLEMENTATION.md` - Detailed scoring system docs
- `GAME_SCORES_SUMMARY.md` - Implementation summary
- `HOW_TO_SEE_SCORES.md` - User guide for viewing scores
- `USER_SESSION_IMPLEMENTATION.md` - Session management docs
- `SUPABASE_CONFIG.md` - Database configuration

## 🔧 Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing

1. Visit `/debug-scores` to see current state
2. Play a game to generate a score
3. Return to puzzle page to see score display
4. Check debug page again to verify score saved
5. Play again to beat your record and earn gems!

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📝 License

This project is part of the Ustoz AI platform.

---

**Need Help?** Visit `/debug-scores` for troubleshooting and user information.
