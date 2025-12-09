-- =====================================================
-- Analytics Schema and Functions
-- =====================================================

-- =====================================================
-- 1. game_play_events table
-- Tracks each game play for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS game_play_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    minigame_id UUID NOT NULL REFERENCES minigames(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_game_play_events_played_at ON game_play_events(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_play_events_minigame_id ON game_play_events(minigame_id);
CREATE INDEX IF NOT EXISTS idx_game_play_events_user_id ON game_play_events(user_id);
-- Composite index for time-based game queries
CREATE INDEX IF NOT EXISTS idx_game_play_events_minigame_played ON game_play_events(minigame_id, played_at DESC);

-- Enable RLS
ALTER TABLE game_play_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow insert for all users" ON game_play_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for all users" ON game_play_events
    FOR SELECT USING (true);

-- Comment
COMMENT ON TABLE game_play_events IS 'Tracks each game play event for analytics purposes';

-- =====================================================
-- 2. get_hourly_play_stats function
-- Returns play counts grouped by hour (0-23)
-- =====================================================
CREATE OR REPLACE FUNCTION get_hourly_play_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    hour INTEGER,
    play_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM played_at)::INTEGER AS hour,
        COUNT(*)::BIGINT AS play_count
    FROM game_play_events
    WHERE played_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY EXTRACT(HOUR FROM played_at)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_hourly_play_stats IS 'Returns play counts grouped by hour (0-23) for the specified number of days back';

-- =====================================================
-- 3. get_most_played_games function
-- Returns games ranked by total plays
-- =====================================================
CREATE OR REPLACE FUNCTION get_most_played_games(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    game_code TEXT,
    game_name TEXT,
    total_plays BIGINT,
    unique_players BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.code AS game_code,
        m.name AS game_name,
        COUNT(gpe.id)::BIGINT AS total_plays,
        COUNT(DISTINCT gpe.user_id)::BIGINT AS unique_players
    FROM minigames m
    LEFT JOIN game_play_events gpe ON m.id = gpe.minigame_id
    GROUP BY m.id, m.code, m.name
    ORDER BY total_plays DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_most_played_games IS 'Returns games ranked by total plays with unique player counts';

-- =====================================================
-- 4. Global Gems Leaderboards
-- =====================================================

-- Global all-time gems leaderboard
CREATE OR REPLACE FUNCTION get_global_gems_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    total_gems INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY uw.total_gems DESC)::BIGINT AS rank,
        uw.user_id,
        uw.total_gems
    FROM user_wallet uw
    WHERE uw.total_gems > 0
    ORDER BY uw.total_gems DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_global_gems_leaderboard IS 'Returns top players by total gems (all-time)';

-- Daily gems leaderboard (based on scores earned today)
CREATE OR REPLACE FUNCTION get_daily_gems_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    gems_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        SUM(gpe.score)::BIGINT AS gems_today
    FROM game_play_events gpe
    WHERE gpe.played_at >= DATE_TRUNC('day', NOW())
    GROUP BY gpe.user_id
    ORDER BY gems_today DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_daily_gems_leaderboard IS 'Returns top players by gems earned today';

-- Weekly gems leaderboard
CREATE OR REPLACE FUNCTION get_weekly_gems_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    gems_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        SUM(gpe.score)::BIGINT AS gems_this_week
    FROM game_play_events gpe
    WHERE gpe.played_at >= DATE_TRUNC('week', NOW())
    GROUP BY gpe.user_id
    ORDER BY gems_this_week DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_weekly_gems_leaderboard IS 'Returns top players by gems earned this week';

-- Monthly gems leaderboard
CREATE OR REPLACE FUNCTION get_monthly_gems_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    gems_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY SUM(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        SUM(gpe.score)::BIGINT AS gems_this_month
    FROM game_play_events gpe
    WHERE gpe.played_at >= DATE_TRUNC('month', NOW())
    GROUP BY gpe.user_id
    ORDER BY gems_this_month DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_monthly_gems_leaderboard IS 'Returns top players by gems earned this month';

-- =====================================================
-- 5. Per-Game Leaderboards
-- =====================================================

-- Global high scores for specific game
CREATE OR REPLACE FUNCTION get_game_leaderboard(game_code TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    highest_score INTEGER,
    last_played TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY ugp.highest_score DESC)::BIGINT AS rank,
        ugp.user_id,
        ugp.highest_score,
        ugp.last_updated AS last_played
    FROM user_game_progress ugp
    JOIN minigames m ON ugp.minigame_id = m.id
    WHERE m.code = game_code
    ORDER BY ugp.highest_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_game_leaderboard IS 'Returns global high scores for a specific game';

-- Daily leaderboard for specific game
CREATE OR REPLACE FUNCTION get_game_daily_leaderboard(game_code TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    best_score_today INTEGER,
    plays_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY MAX(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        MAX(gpe.score)::INTEGER AS best_score_today,
        COUNT(*)::BIGINT AS plays_today
    FROM game_play_events gpe
    JOIN minigames m ON gpe.minigame_id = m.id
    WHERE m.code = game_code
      AND gpe.played_at >= DATE_TRUNC('day', NOW())
    GROUP BY gpe.user_id
    ORDER BY best_score_today DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_game_daily_leaderboard IS 'Returns daily best scores for a specific game';

-- Weekly leaderboard for specific game
CREATE OR REPLACE FUNCTION get_game_weekly_leaderboard(game_code TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    best_score_this_week INTEGER,
    plays_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY MAX(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        MAX(gpe.score)::INTEGER AS best_score_this_week,
        COUNT(*)::BIGINT AS plays_this_week
    FROM game_play_events gpe
    JOIN minigames m ON gpe.minigame_id = m.id
    WHERE m.code = game_code
      AND gpe.played_at >= DATE_TRUNC('week', NOW())
    GROUP BY gpe.user_id
    ORDER BY best_score_this_week DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_game_weekly_leaderboard IS 'Returns weekly best scores for a specific game';

-- Monthly leaderboard for specific game
CREATE OR REPLACE FUNCTION get_game_monthly_leaderboard(game_code TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    best_score_this_month INTEGER,
    plays_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY MAX(gpe.score) DESC)::BIGINT AS rank,
        gpe.user_id,
        MAX(gpe.score)::INTEGER AS best_score_this_month,
        COUNT(*)::BIGINT AS plays_this_month
    FROM game_play_events gpe
    JOIN minigames m ON gpe.minigame_id = m.id
    WHERE m.code = game_code
      AND gpe.played_at >= DATE_TRUNC('month', NOW())
    GROUP BY gpe.user_id
    ORDER BY best_score_this_month DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_game_monthly_leaderboard IS 'Returns monthly best scores for a specific game';

-- =====================================================
-- 6. Helper function to record game plays
-- Call this when a game is completed
-- =====================================================
CREATE OR REPLACE FUNCTION record_game_play(
    p_user_id UUID,
    p_minigame_code TEXT,
    p_score INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_minigame_id UUID;
    v_event_id UUID;
BEGIN
    -- Get minigame ID from code
    SELECT id INTO v_minigame_id
    FROM minigames
    WHERE code = p_minigame_code;
    
    IF v_minigame_id IS NULL THEN
        RAISE EXCEPTION 'Invalid minigame code: %', p_minigame_code;
    END IF;
    
    -- Insert play event
    INSERT INTO game_play_events (user_id, minigame_id, score)
    VALUES (p_user_id, v_minigame_id, p_score)
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_game_play IS 'Records a game play event. Call this when a game is completed.';

