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

async function readGameDataFile(uniqid: string): Promise<any> {
  if (window.electron?.games?.readFile) {
    try {
      const fileContent = await window.electron.games.readFile(uniqid, 'game-data.json');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading game data via Electron:', error);
      throw error;
    }
  } else {
    const response = await fetch(`/data/games/${uniqid}/game-data.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch game data: ${response.statusText}`);
    }
    return await response.json();
  }
}

export async function getGamePublic(uniqid: string): Promise<string | null> {
  try {
    const gameData = await readGameDataFile(uniqid);
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

export { readGameDataFile };
