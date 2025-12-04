import { supabase } from './supabase';

export interface GameProgress {
  user_id: string;
  game_id: number;
  highest_score: number;
  last_updated: string;
}

export interface UserWallet {
  user_id: string;
  total_gems: number;
}

/**
 * Updates the user's score and calculates earned gems based on the new record.
 * 
 * Rules:
 * - If no record exists: Earn gems = new_score.
 * - If record exists and new_score > highest_score: Earn gems = new_score - highest_score.
 * - Otherwise: Earn 0 gems.
 * 
 * @param userId - The UUID of the user
 * @param gameId - The ID of the mini-game
 * @param newScore - The score achieved in the current game
 * @returns The amount of gems earned
 */
export async function updateScoreAndGems(
  userId: string,
  gameId: number,
  newScore: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('update_score_and_gems', {
      p_user_id: userId,
      p_game_id: gameId,
      p_new_score: newScore,
    });

    if (error) {
      console.error('Error updating score and gems:', error);
      throw error;
    }

    return data as number;
  } catch (error) {
    console.error('Failed to update game progress:', error);
    // In case of error, returning 0 avoids breaking the UI flow, 
    // but you might want to handle it differently depending on UX requirements.
    return 0;
  }
}

/**
 * Fetches the user's current gem balance.
 * Returns 0 for new users who haven't played any games yet.
 */
export async function getUserGems(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_wallet')
    .select('total_gems')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle() to return null instead of error when no rows

  if (error) {
    console.error('Error fetching user gems:', error);
    return 0;
  }

  // New users won't have a wallet entry yet - return 0
  return data?.total_gems ?? 0;
}

/**
 * Fetches all game records for a user.
 * Returns a map of game name -> highest score.
 */
export async function getUserGameRecords(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('user_game_progress')
    .select(`
      highest_score,
      mini_games (
        name
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching game records:', error);
    return {};
  }

  const records: Record<string, number> = {};
  data?.forEach((item: any) => {
    if (item.mini_games?.name) {
      records[item.mini_games.name] = item.highest_score;
    }
  });
  
  return records;
}

export async function getGameIdByName(name: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('mini_games')
    .select('id')
    .eq('name', name)
    .single();

  if (error || !data) {
    console.error('Error fetching game ID:', error);
    return null;
  }

  return data.id;
}



