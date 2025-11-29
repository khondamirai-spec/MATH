-- =====================================================
-- Math Game Platform Database Schema
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. mini_games table
-- Stores different mini-game types
-- =====================================================
CREATE TABLE IF NOT EXISTS mini_games (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    skill_type TEXT NOT NULL CHECK (skill_type IN ('calculator', 'operator_guess', 'multiple_choice', 'speed_test')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. questions table
-- Stores questions for each mini-game
-- =====================================================
CREATE TABLE IF NOT EXISTS questions (
    question_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id INTEGER NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    concept_tag TEXT NOT NULL CHECK (concept_tag IN ('addition', 'subtraction', 'multiplication', 'division')),
    question_type TEXT NOT NULL CHECK (question_type IN ('input', 'operator_select', 'multiple_choice', 'timed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. user_game_progress table
-- Tracks user's highest score per mini-game
-- =====================================================
CREATE TABLE IF NOT EXISTS user_game_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
    highest_score INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

-- =====================================================
-- 4. user_question_stats table
-- Duolingo-style tracking: tracks attempts, mistakes, mastery per question
-- =====================================================
CREATE TABLE IF NOT EXISTS user_question_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    attempts INTEGER NOT NULL DEFAULT 0,
    wrong_attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    is_mastered BOOLEAN NOT NULL DEFAULT false,
    last_answered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- =====================================================
-- 5. user_wallet table
-- Tracks user's diamond currency
-- =====================================================
CREATE TABLE IF NOT EXISTS user_wallet (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_diamonds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for performance optimization
-- =====================================================

-- Indexes for user_game_progress
CREATE INDEX IF NOT EXISTS idx_user_game_progress_user_id ON user_game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_progress_game_id ON user_game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_progress_highest_score ON user_game_progress(highest_score DESC);

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_game_id ON questions(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_concept_tag ON questions(concept_tag);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON questions(question_type);

-- Indexes for user_question_stats
CREATE INDEX IF NOT EXISTS idx_user_question_stats_user_id ON user_question_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_stats_question_id ON user_question_stats(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_stats_is_mastered ON user_question_stats(is_mastered);
CREATE INDEX IF NOT EXISTS idx_user_question_stats_last_answered ON user_question_stats(last_answered DESC);

-- =====================================================
-- Function to automatically update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_mini_games_updated_at
    BEFORE UPDATE ON mini_games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_question_stats_updated_at
    BEFORE UPDATE ON user_question_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallet_updated_at
    BEFORE UPDATE ON user_wallet
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Function to handle diamond rewards when user beats record
-- This function calculates diamonds: (new_score - old_record)
-- Should be called from application logic
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_diamond_reward(
    p_user_id UUID,
    p_game_id INTEGER,
    p_new_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_old_record INTEGER;
    v_diamonds_earned INTEGER;
BEGIN
    -- Get current highest score (record)
    SELECT COALESCE(highest_score, 0)
    INTO v_old_record
    FROM user_game_progress
    WHERE user_id = p_user_id AND game_id = p_game_id;

    -- Only reward diamonds if new score beats old record
    IF p_new_score > v_old_record THEN
        v_diamonds_earned := p_new_score - v_old_record;
        
        -- Update user_game_progress
        INSERT INTO user_game_progress (user_id, game_id, highest_score, last_updated)
        VALUES (p_user_id, p_game_id, p_new_score, NOW())
        ON CONFLICT (user_id, game_id)
        DO UPDATE SET
            highest_score = p_new_score,
            last_updated = NOW();

        -- Update user_wallet (create if doesn't exist)
        INSERT INTO user_wallet (user_id, total_diamonds)
        VALUES (p_user_id, v_diamonds_earned)
        ON CONFLICT (user_id)
        DO UPDATE SET
            total_diamonds = user_wallet.total_diamonds + v_diamonds_earned,
            updated_at = NOW();

        RETURN v_diamonds_earned;
    ELSE
        -- Update last_updated even if no record broken
        INSERT INTO user_game_progress (user_id, game_id, highest_score, last_updated)
        VALUES (p_user_id, p_game_id, COALESCE(v_old_record, 0), NOW())
        ON CONFLICT (user_id, game_id)
        DO UPDATE SET last_updated = NOW();

        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE mini_games IS 'Stores different mini-game types: Kalkulyator, Belgini Top, To''g''ri Javob, Tez Hisoblash';
COMMENT ON TABLE questions IS 'Stores questions for each mini-game with concept tags and question types';
COMMENT ON TABLE user_game_progress IS 'Tracks each user''s highest score (record) per mini-game';
COMMENT ON TABLE user_question_stats IS 'Duolingo-style tracking: tracks attempts, mistakes, and mastery per question for each user';
COMMENT ON TABLE user_wallet IS 'Stores user''s total diamonds (rewards for beating records)';

COMMENT ON FUNCTION calculate_diamond_reward IS 'Calculates and awards diamonds when user beats their previous record. Returns diamonds earned (0 if no record broken).';


