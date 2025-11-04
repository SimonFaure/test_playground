import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const db = {
  getGameTypes: async () => {
    const { data, error } = await supabase
      .from('game_types')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },
  getScenarios: async (gameTypeId?: string) => {
    let query = supabase
      .from('scenarios')
      .select('*')
      .order('title');

    if (gameTypeId) {
      query = query.eq('game_type_id', gameTypeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },
};
