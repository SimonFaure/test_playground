import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

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

  getGameTypeByName: async (name: string) => {
    const { data, error } = await supabase
      .from('game_types')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  getScenarios: async (gameTypeId?: string) => {
    let query = supabase
      .from('scenarios')
      .select(`
        *,
        game_type:game_types(*)
      `)
      .order('created_at', { ascending: false });

    if (gameTypeId) {
      query = query.eq('game_type_id', gameTypeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  createScenario: async (scenario: {
    uniqid: string;
    game_type_id: string;
    title: string;
    description: string;
    difficulty?: string;
    duration_minutes?: number;
    slug?: string;
    origin?: string;
  }) => {
    const { data, error } = await supabase
      .from('scenarios')
      .insert(scenario)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  createScenarioFile: async (file: {
    scenario_id: string;
    file_name: string;
    file_content: string;
  }) => {
    const { data, error } = await supabase
      .from('scenario_files')
      .insert(file)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  uploadMediaFile: async (path: string, file: Blob) => {
    const { data, error } = await supabase.storage
      .from('game-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  }
};
