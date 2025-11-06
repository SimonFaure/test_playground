import { createClient } from '@supabase/supabase-js';
import gamesData from '../../data/games.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

export const db = {
  getGameTypes: async () => {
    return gamesData.game_types;
  },
  getScenarios: async (gameTypeId?: string) => {
    if (gameTypeId) {
      return gamesData.scenarios.filter(s => s.game_type_id === gameTypeId);
    }
    return gamesData.scenarios;
  },
};
