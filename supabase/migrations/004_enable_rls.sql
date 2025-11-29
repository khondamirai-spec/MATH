-- Enable RLS on tables
ALTER TABLE user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_progress ENABLE ROW LEVEL SECURITY;

-- Policies for user_wallet
-- Users can only view their own wallet
CREATE POLICY "Users can view own wallet" 
ON user_wallet 
FOR SELECT 
USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy for users on user_wallet
-- Modifications must be done via the secure RPC function (update_score_and_gems)

-- Policies for user_game_progress
-- Users can view their own progress
CREATE POLICY "Users can view own game progress" 
ON user_game_progress 
FOR SELECT 
USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy for users on user_game_progress
-- Modifications must be done via the secure RPC function (update_score_and_gems)

-- Note: user_game_sessions and user_question_stats should also be secured if they handle sensitive data
-- For completeness relative to the "math game" context:

ALTER TABLE user_question_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question stats" 
ON user_question_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own question stats" 
ON user_question_stats 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- user_game_sessions (no FK to auth.users in current schema, but logic implies ownership)
ALTER TABLE user_game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
ON user_game_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


