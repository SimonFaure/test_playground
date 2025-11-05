import gamesData from '../../data/games.json';

export async function getLocalGameIds(): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    console.log('Electron fs/path not available, cannot check local games');
    return [];
  }

  try {
    const gamesDir = path.join(process.cwd(), 'data', 'games');
    console.log('Looking for games in:', gamesDir);

    if (!fs.existsSync(gamesDir)) {
      console.log('Games directory does not exist');
      return [];
    }

    const folders = fs.readdirSync(gamesDir, { withFileTypes: true });
    const folderNames = folders
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .map((dirent: { name: string }) => dirent.name);

    console.log('Folders in data/games:', folderNames);

    const uniqidsFromJson = gamesData.scenarios
      .filter(scenario => scenario.uniqid)
      .map(scenario => scenario.uniqid as string);

    console.log('Uniqids in games.json:', uniqidsFromJson);

    const matchingIds = uniqidsFromJson.filter(uniqid => folderNames.includes(uniqid));

    console.log('Matching game IDs (in both games.json and games folder):', matchingIds);
    return matchingIds;
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
