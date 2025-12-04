# 👀 How to See Your Game Scores

## Quick Guide: 3 Easy Steps

### Step 1: Open Your App
Visit your app homepage at your domain (e.g., `https://math.khondamir.com`)

### Step 2: Check Your User ID
At the bottom of the homepage, you'll see:
```
User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 3: View Your Scores
Click the link: **"🔍 View All Game Scores & Debug Info"**

---

## 🎮 What You'll See on Game Pages

### Before Playing (New User)
When you visit any puzzle page, you'll see:

```
┌───────────────────────────────────┐
│ 🎮 Kalkulyator                    │
│ Matematik amallarni hisoblang     │
│ ─────────────────────────────────│
│ Ball: 💎 0                        │ ← Not played yet
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ 🎯 Belgini top                    │
│ Noma'lum belgini toping          │
│ ─────────────────────────────────│
│ Ball: 💎 0                        │ ← Not played yet
└───────────────────────────────────┘
```

### After Playing (With Scores!)
After you play some games, you'll see:

```
┌───────────────────────────────────┐
│ 🎮 Kalkulyator                    │
│ Matematik amallarni hisoblang     │
│ ─────────────────────────────────│
│ Ball: 💎 10                       │ ← Your high score!
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ 🎯 Belgini top                    │
│ Noma'lum belgini toping          │
│ ─────────────────────────────────│
│ Ball: 💎 19                       │ ← Your high score!
└───────────────────────────────────┘

┌───────────────────────────────────┐
│ ✅ To'g'ri javob                  │
│ To'g'ri javobni toping           │
│ ─────────────────────────────────│
│ Ball: 💎 7                        │ ← Your high score!
└───────────────────────────────────┘
```

---

## 🔍 Debug Page Features

Visit `/debug-scores` to see:

### 1. User Information
```
👤 User Information
User ID: 1e4659d1-5176-42f0-b477-17169f9cf2ec
Total Gems: 💎 45
```

### 2. All Your Game Scores
```
🎮 Game Records (5 games played)

┌─────────────────────────────────┐
│ Belgini top          💎 19      │
├─────────────────────────────────┤
│ Kalkulyator          💎 10      │
├─────────────────────────────────┤
│ Og'zaki hisob        💎 6       │
├─────────────────────────────────┤
│ Tez hisoblash        💎 2       │
├─────────────────────────────────┤
│ To'g'ri javob        💎 7       │
└─────────────────────────────────┘
```

### 3. Quick Navigation
Direct links to all three puzzle pages:
- 🧩 Math Puzzle
- 🧠 Memory Puzzle
- ⚡ Train Your Brain

---

## 🎯 Real Example from Your Database

I checked your production database and found this active user with scores:

**User ID**: `1e4659d1-5176-42f0-b477-17169f9cf2ec`

**Their Scores:**
| Game | Score | Last Played |
|------|-------|-------------|
| Belgini top | 💎 19 | Today |
| Kalkulyator | 💎 10 | Today |
| To'g'ri javob | 💎 7 | Today |
| Og'zaki hisob | 💎 6 | Today |
| Tez hisoblash | 💎 2 | Today |

**Total Gems Earned**: 💎 44

This is exactly what they see when they visit the puzzle pages!

---

## 🎨 Visual Examples

### Math Puzzle Page
When you visit `/math-puzzle`, you'll see 4 game cards with scores:

**Card 1: Kalkulyator**
- Shows: Ball: 💎 10
- Your highest score in the calculator game

**Card 2: Belgini top**
- Shows: Ball: 💎 19
- Your highest score in find the operator game

**Card 3: To'g'ri javob**
- Shows: Ball: 💎 7
- Your highest score in missing number game

**Card 4: Tez hisoblash**
- Shows: Ball: 💎 2
- Your highest score in fast calculation game

### Memory Puzzle Page
Visit `/memory-puzzle` to see 4 memory game scores:
- Og'zaki hisob: 💎 6
- Juftlikni top: 💎 0 (not played)
- Tez plitalar: 💎 0 (not played)
- Kvadrat ildiz: 💎 0 (not played)

### Train Your Brain Page
Visit `/train-your-brain` to see 3 brain game scores:
- Kunlik vazifa: 💎 0 (not played)
- Mantiqiy to'r: 💎 0 (not played)
- Tez fikrlash: 💎 0 (not played)

---

## 🚀 How to Test Right Now

1. **Open your app** in a browser
2. **Note your User ID** from the bottom of the homepage
3. **Click** "🔍 View All Game Scores & Debug Info"
4. **See** your current scores (might be 0 if you haven't played)
5. **Play a game** from any puzzle page
6. **Complete the game** to get a score
7. **Go back** to the puzzle selection page
8. **See your score** displayed as 💎 {your_score}
9. **Visit debug page again** to see the updated score

---

## ✅ Expected Behavior

### First Time Playing
- All games show: `💎 0`
- Total gems: `💎 0`

### After Playing 1 Game
- That game shows: `💎 {your_score}`
- Other games still show: `💎 0`
- Total gems: `💎 {your_score}`

### After Beating Your Record
- Game shows: `💎 {new_higher_score}`
- Total gems: `💎 {previous_total + difference}`
- Example: Had 10, got 15 → Earn 5 more gems

### After Playing All 11 Games
- All games show their respective scores
- Total gems = sum of all best scores
- Debug page shows complete list

---

## 🆘 Troubleshooting

### "I see 💎 0 everywhere"
**Reason**: You haven't played any games yet with this User ID

**Solution**: 
1. Play at least one game
2. Complete it to get a score
3. Go back to see your score updated

### "Scores disappeared after closing browser"
**Reason**: Browser cleared localStorage

**Solution**:
- Your User ID is stored in localStorage
- If cleared, a new User ID is generated
- Scores are tied to User ID, so new ID = fresh start

### "Score not updating"
**Reason**: Possible caching issue

**Solution**:
1. Refresh the page (F5)
2. Check browser console for errors (F12)
3. Visit `/debug-scores` to see if score is in database
4. Clear browser cache if needed

### "Different scores on different devices"
**Reason**: Each browser/device has its own localStorage

**Solution**:
- Scores are per-device unless you share the same User ID
- Future: Implement user authentication for cross-device sync

---

## 📱 Testing Checklist

- [ ] Homepage loads with User ID at bottom
- [ ] Debug link visible at bottom of homepage
- [ ] Debug page shows User ID and total gems
- [ ] Math Puzzle page shows 4 game cards
- [ ] Memory Puzzle page shows 4 game cards
- [ ] Train Your Brain page shows 3 game cards
- [ ] All games initially show 💎 0 (if new user)
- [ ] Playing a game saves the score
- [ ] Going back shows updated score on card
- [ ] Debug page shows the new score
- [ ] Beating record increases total gems

---

## 🎉 Success!

If you see scores like `💎 10`, `💎 19`, etc. on your game cards, **it's working perfectly!** 

Your game records are being tracked and displayed exactly as requested. Each user's highest score for each game appears right there on the card with the diamond emoji.

**The system is complete and functional!** 🚀

---

*Need help? Check the debug page at `/debug-scores` for detailed information about your scores and user session.*

