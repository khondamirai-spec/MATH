import { supabase } from './supabase';

export interface GameProgress {
  user_id: string;
  minigame_id: string;
  highest_score: number;
  last_updated: string;
}

export interface UserWallet {
  user_id: string;
  total_gems: number;
}

// Mapping of game names to minigame codes
export const GAME_NAME_TO_CODE: Record<string, string> = {
  "Kalkulyator": "calculator",
  "Belgini top": "find_operator",
  "To'g'ri javob": "missing_number",
  "Tez hisoblash": "fast_calc",
  "Og'zaki hisob": "mental_sequence",
  "Juftlikni top": "matching_cards",
  "Mantiqiy to'r": "math_grid",
  "Kvadrat ildiz": "square_root",
  "Rasm Boshqotirma": "picture_equation",
  "Sehrli Uchburchak": "magic_triangle",
  "Raqamli Piramida": "number_pyramid",
};

/**
 * Updates the user's score and calculates earned gems based on the new record.
 * 
 * Rules:
 * - If no record exists: Earn gems = new_score.
 * - If record exists and new_score > highest_score: Earn gems = new_score - highest_score.
 * - Otherwise: Earn 0 gems.
 * 
 * @param userId - The UUID of the user
 * @param minigameId - The UUID of the minigame
 * @param newScore - The score achieved in the current game
 * @returns The amount of gems earned
 */
export async function updateScoreAndGems(
  userId: string,
  minigameId: string,
  newScore: number
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('update_score_and_gems', {
      p_user_id: userId,
      p_minigame_id: minigameId,
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
      minigames (
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
    if (item.minigames?.name) {
      records[item.minigames.name] = item.highest_score;
    }
  });
  
  return records;
}

/**
 * Fetches a minigame ID by its code.
 * @param code - The code of the minigame (e.g., 'calculator', 'find_operator')
 * @returns The UUID of the minigame or null if not found
 */
export async function getMinigameIdByCode(code: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('minigames')
    .select('id')
    .eq('code', code)
    .single();

  if (error || !data) {
    console.error('Error fetching minigame ID:', error);
    return null;
  }

  return data.id;
}



