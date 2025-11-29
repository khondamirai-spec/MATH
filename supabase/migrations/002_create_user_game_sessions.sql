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


