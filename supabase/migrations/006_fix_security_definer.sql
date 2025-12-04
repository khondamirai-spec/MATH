-- Fix: Make update_score_and_gems a SECURITY DEFINER function
-- This allows the function to bypass RLS and insert/update wallet and progress tables
-- Without this, guest users cannot save their diamonds because RLS blocks the inserts/updates

CREATE OR REPLACE FUNCTION public.update_score_and_gems(p_user_id uuid, p_minigame_id uuid, p_new_score integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.update_score_and_gems(uuid, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.update_score_and_gems(uuid, uuid, integer) TO authenticated;

