-- =====================================================
-- Create proper minigames and minigame_levels tables
-- =====================================================

-- Create minigames table (without underscore, with code field)
CREATE TABLE IF NOT EXISTS minigames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create minigame_levels table
CREATE TABLE IF NOT EXISTS minigame_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    minigame_id UUID NOT NULL REFERENCES minigames(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    number_range_min INTEGER NOT NULL DEFAULT 1,
    number_range_max INTEGER NOT NULL DEFAULT 10,
    question_count INTEGER NOT NULL DEFAULT 10,
    time_limit INTEGER, -- optional time limit in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(minigame_id, level)
);

-- Update user_game_progress to reference minigames instead of mini_games
-- First, check if user_game_progress needs to be updated
DO $$
BEGIN
    -- Drop the foreign key constraint on game_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_game_progress_game_id_fkey'
        AND table_name = 'user_game_progress'
    ) THEN
        ALTER TABLE user_game_progress DROP CONSTRAINT user_game_progress_game_id_fkey;
    END IF;
    
    -- Rename game_id to minigame_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_game_progress' 
        AND column_name = 'game_id'
    ) THEN
        ALTER TABLE user_game_progress RENAME COLUMN game_id TO minigame_id;
    END IF;
    
    -- Change minigame_id type to UUID if it's not already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_game_progress' 
        AND column_name = 'minigame_id'
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE user_game_progress ALTER COLUMN minigame_id TYPE UUID USING minigame_id::uuid;
    END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE user_game_progress 
ADD CONSTRAINT user_game_progress_minigame_id_fkey 
FOREIGN KEY (minigame_id) REFERENCES minigames(id) ON DELETE CASCADE;

-- Update the unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_game_progress_user_id_game_id_key'
        AND table_name = 'user_game_progress'
    ) THEN
        ALTER TABLE user_game_progress DROP CONSTRAINT user_game_progress_user_id_game_id_key;
    END IF;
END $$;

ALTER TABLE user_game_progress 
ADD CONSTRAINT user_game_progress_user_id_minigame_id_key 
UNIQUE(user_id, minigame_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_minigames_code ON minigames(code);
CREATE INDEX IF NOT EXISTS idx_minigame_levels_minigame_id ON minigame_levels(minigame_id);
CREATE INDEX IF NOT EXISTS idx_minigame_levels_level ON minigame_levels(level);
CREATE INDEX IF NOT EXISTS idx_user_game_progress_minigame_id ON user_game_progress(minigame_id);

-- Trigger for updated_at
CREATE TRIGGER update_minigames_updated_at
    BEFORE UPDATE ON minigames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_minigame_levels_updated_at
    BEFORE UPDATE ON minigame_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert all minigames with their codes
INSERT INTO minigames (name, code, description) VALUES
    ('Kalkulyator', 'calculator', 'Matematik amallarni tez hisoblash'),
    ('Belgini top', 'find_operator', 'Tenglamadagi noma''lum belgini toping'),
    ('To''g''ri javob', 'missing_number', 'To''g''ri javobni toping'),
    ('Tez hisoblash', 'fast_calc', 'Tezkor hisoblash mashqlari'),
    ('Og''zaki hisob', 'mental_sequence', 'Xotirada hisoblash'),
    ('Juftlikni top', 'matching_cards', 'Kartochka juftliklarini toping'),
    ('Tez plitalar', 'math_grid', 'Matematik gridni yeching'),
    ('Kvadrat ildiz', 'square_root', 'Kvadrat ildizni toping'),
    ('Kunlik vazifa', 'picture_equation', 'Rasm tenglamalarini yeching'),
    ('Mantiqiy to''r', 'magic_triangle', 'Sehrli uchburchakni to''ldiring'),
    ('Tez fikrlash', 'number_pyramid', 'Raqamlar piramidasini yeching')
ON CONFLICT (code) DO NOTHING;

-- Insert default levels for each game
DO $$
DECLARE
    v_minigame_id UUID;
    v_code TEXT;
BEGIN
    -- For each minigame, create 3 default levels
    FOR v_minigame_id, v_code IN 
        SELECT id, code FROM minigames
    LOOP
        -- Level 1: Easy
        INSERT INTO minigame_levels (minigame_id, level, number_range_min, number_range_max, question_count, time_limit)
        VALUES (v_minigame_id, 1, 1, 10, 10, 60)
        ON CONFLICT (minigame_id, level) DO NOTHING;
        
        -- Level 2: Medium
        INSERT INTO minigame_levels (minigame_id, level, number_range_min, number_range_max, question_count, time_limit)
        VALUES (v_minigame_id, 2, 1, 100, 20, 90)
        ON CONFLICT (minigame_id, level) DO NOTHING;
        
        -- Level 3: Hard
        INSERT INTO minigame_levels (minigame_id, level, number_range_min, number_range_max, question_count, time_limit)
        VALUES (v_minigame_id, 3, 1, 500, 30, 120)
        ON CONFLICT (minigame_id, level) DO NOTHING;
    END LOOP;
END $$;

-- Update the update_score_and_gems function to use UUID for minigame_id
CREATE OR REPLACE FUNCTION update_score_and_gems(
    p_user_id UUID,
    p_minigame_id UUID,  -- Changed from INTEGER to UUID
    p_new_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_old_record INTEGER;
    v_earned_gems INTEGER;
BEGIN
    -- Check existing record
    SELECT highest_score INTO v_old_record
    FROM user_game_progress
    WHERE user_id = p_user_id AND minigame_id = p_minigame_id;

    -- Case 1: No record exists
    IF v_old_record IS NULL THEN
        v_earned_gems := p_new_score;
        
        -- Insert new progress
        INSERT INTO user_game_progress (user_id, minigame_id, highest_score, last_updated)
        VALUES (p_user_id, p_minigame_id, p_new_score, NOW());
        
        -- Update wallet (create if missing)
        INSERT INTO user_wallet (user_id, total_gems)
        VALUES (p_user_id, v_earned_gems)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            total_gems = user_wallet.total_gems + v_earned_gems,
            updated_at = NOW();
            
        RETURN v_earned_gems;

    -- Case 2: Record exists and new score is higher
    ELSIF p_new_score > v_old_record THEN
        v_earned_gems := p_new_score - v_old_record;
        
        -- Update progress
        UPDATE user_game_progress
        SET highest_score = p_new_score,
            last_updated = NOW()
        WHERE user_id = p_user_id AND minigame_id = p_minigame_id;
        
        -- Update wallet
        INSERT INTO user_wallet (user_id, total_gems)
        VALUES (p_user_id, v_earned_gems)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            total_gems = user_wallet.total_gems + v_earned_gems,
            updated_at = NOW();
            
        RETURN v_earned_gems;

    -- Case 3: Record exists but score is lower or equal
    ELSE
        -- Just update last_updated timestamp
        UPDATE user_game_progress
        SET last_updated = NOW()
        WHERE user_id = p_user_id AND minigame_id = p_minigame_id;
        
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE minigames IS 'Stores all available minigames with their codes';
COMMENT ON TABLE minigame_levels IS 'Stores level configurations for each minigame';
COMMENT ON FUNCTION update_score_and_gems IS 'Updates user score and calculates earned gems. Returns gems earned.';

