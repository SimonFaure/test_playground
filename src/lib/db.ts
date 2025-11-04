import { invoke } from '@tauri-apps/api/core';

export const db = {
  register: async (email: string, password: string) => {
    try {
      await invoke('register', { email, password });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  login: async (email: string, password: string) => {
    try {
      const user = await invoke('login', { email, password });
      return { success: true, user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
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
