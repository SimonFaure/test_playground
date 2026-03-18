export async function getLocalGameIds(): Promise<string[]> {
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  if (!isElectron) {
    const gamesListKey = 'uploaded_games_list';
    const gamesList = JSON.parse(localStorage.getItem(gamesListKey) || '[]');
    console.log('Browser storage games found:', gamesList);
    return gamesList;
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
