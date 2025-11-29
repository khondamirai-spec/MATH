-- Rename total_diamonds to total_gems in user_wallet
ALTER TABLE user_wallet 
RENAME COLUMN total_diamonds TO total_gems;

-- Ensure defaults and constraints
ALTER TABLE user_wallet 
ALTER COLUMN total_gems SET DEFAULT 0;

ALTER TABLE user_game_progress 
ALTER COLUMN highest_score SET DEFAULT 0;

-- Drop old function
DROP FUNCTION IF EXISTS calculate_diamond_reward;

-- Create new function for game logic
CREATE OR REPLACE FUNCTION update_score_and_gems(
    p_user_id UUID,
    p_game_id INTEGER,
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
    WHERE user_id = p_user_id AND game_id = p_game_id;

    -- Case 1: No record exists
    IF v_old_record IS NULL THEN
        v_earned_gems := p_new_score;
        
        -- Insert new progress
        INSERT INTO user_game_progress (user_id, game_id, highest_score, last_updated)
        VALUES (p_user_id, p_game_id, p_new_score, NOW());
        
        -- Update wallet (create if missing, though trigger should have handled it)
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
        WHERE user_id = p_user_id AND game_id = p_game_id;
        
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
        WHERE user_id = p_user_id AND game_id = p_game_id;
        
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize wallet on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallet (user_id, total_gems)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;


