import { supabase } from '../lib/db';

export async function getLocalGameIds(): Promise<string[]> {
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  if (!isElectron) {
    try {
      const { data: scenarios, error } = await supabase
        .from('scenarios')
        .select('uniqid');

      if (error) {
        console.error('Error fetching scenarios:', error);
        return [];
      }

      const gameIds = scenarios?.map(s => s.uniqid) || [];
      console.log('Browser storage games found:', gameIds);
      return gameIds;
    } catch (error) {
      console.error('Error reading games from Supabase:', error);
      return [];
    }
  }

  try {
    const localGameIds = await (window as any).electron.games.list();
    console.log('Local game folders found:', localGameIds);
    return localGameIds;
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
