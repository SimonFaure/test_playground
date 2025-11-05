import gamesData from '../../data/games.json';

export async function getLocalGameIds(): Promise<string[]> {
  try {
    const gameIds = gamesData.scenarios
      .filter(scenario => scenario.uniqid)
      .map(scenario => scenario.uniqid as string);

    console.log('Local game IDs from games.json:', gameIds);
    return gameIds;
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
