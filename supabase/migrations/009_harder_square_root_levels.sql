-- =====================================================
-- Make Square Root game Level 3 much harder
-- Players were farming too many gems (400-5000+) from easy L3
-- =====================================================

-- Update square_root minigame levels to be more challenging
DO $$
DECLARE
    v_minigame_id UUID;
BEGIN
    -- Get the square_root minigame ID
    SELECT id INTO v_minigame_id
    FROM minigames
    WHERE code = 'square_root';
    
    IF v_minigame_id IS NOT NULL THEN
        -- Level 1: Easy (roots 2-10, squares 4-100)
        UPDATE minigame_levels
        SET number_range_min = 4,
            number_range_max = 100,
            question_count = 10
        WHERE minigame_id = v_minigame_id AND level = 1;
        
        -- Level 2: Medium (roots 10-25, squares 100-625)
        UPDATE minigame_levels
        SET number_range_min = 100,
            number_range_max = 625,
            question_count = 20
        WHERE minigame_id = v_minigame_id AND level = 2;
        
        -- Level 3: HARD (roots 50-100, squares 2500-10000)
        -- This is much harder - requires knowing squares of numbers 50-100
        UPDATE minigame_levels
        SET number_range_min = 2500,
            number_range_max = 10000,
            question_count = 30
        WHERE minigame_id = v_minigame_id AND level = 3;
    END IF;
END $$;

-- Add comment explaining the change
COMMENT ON TABLE minigame_levels IS 'Level configurations for minigames. Square root L3 uses roots 50-100 to prevent gem farming.';

