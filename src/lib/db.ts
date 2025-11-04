import { invoke } from '@tauri-apps/api/core';

export const db = {
  getGameTypes: async () => {
    try {
      const data = await invoke('get_game_types');
      return data;
    } catch (error) {
      console.error('Error loading game types:', error);
      return [];
    }
  },
  getScenarios: async (gameTypeId?: string) => {
    try {
      const data = await invoke('get_scenarios', { gameTypeId: gameTypeId || null });
      return data;
    } catch (error) {
      console.error('Error loading scenarios:', error);
      return [];
    }
  },
};
