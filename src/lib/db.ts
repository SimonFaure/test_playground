import gamesData from '../../data/games.json';

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
