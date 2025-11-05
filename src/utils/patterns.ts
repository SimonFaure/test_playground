export async function getPatternFolders(gameTypeName: string): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    console.log('Electron fs/path not available, using default patterns');
    return ['ado-adultes', 'kids', 'mini-kids'];
  }

  try {
    const patternsDir = path.join(process.cwd(), 'data', 'patterns', gameTypeName.toLowerCase());

    if (!fs.existsSync(patternsDir)) {
      console.log('Patterns directory does not exist:', patternsDir);
      return ['ado-adultes', 'kids', 'mini-kids'];
    }

    const folders = fs.readdirSync(patternsDir, { withFileTypes: true });
    const patternFolders = folders
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .map((dirent: { name: string }) => dirent.name);

    console.log('Pattern folders found:', patternFolders);
    return patternFolders;
  } catch (error) {
    console.error('Error reading pattern folders:', error);
    return ['ado-adultes', 'kids', 'mini-kids'];
  }
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
