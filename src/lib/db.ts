import { createClient } from '@supabase/supabase-js';
import gamesData from '../../data/games.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('🔧 Supabase initialization:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing'
});

let supabaseClient: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client created successfully');
  } catch (error) {
    console.error('✗ Failed to create Supabase client:', error);
  }
} else {
  console.warn('⚠ Supabase credentials missing - database features will not work');
}

export const supabase = supabaseClient;

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
