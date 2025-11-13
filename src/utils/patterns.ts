export async function getPatternFolders(gameTypeName: string): Promise<string[]> {
  if (window.electron?.patterns?.listFolders) {
    try {
      const folders = await window.electron.patterns.listFolders(gameTypeName);
      console.log('Pattern folders found:', folders);
      return folders;
    } catch (error) {
      console.error('Error reading pattern folders:', error);
      return ['ado_adultes', 'kids', 'mini_kids'];
    }
  }

  console.log('Electron patterns API not available, using default patterns');
  return ['ado_adultes', 'kids', 'mini_kids'];
}

export async function getGamePublic(uniqid: string): Promise<string | null> {
  try {
    const response = await fetch(`/data/games/${uniqid}/game-data.json`);
    if (!response.ok) {
      console.warn(`Could not load game data for ${uniqid}`);
      return null;
    }

    const gameData = await response.json();
    const gamePublic = gameData?.game_meta?.game_public;

    if (gamePublic) {
      console.log('Found game_public:', gamePublic);
      return gamePublic;
    }

    return null;
  } catch (error) {
    console.error('Error reading game data:', error);
    return null;
  }
}
