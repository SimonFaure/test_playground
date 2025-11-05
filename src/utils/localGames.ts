export async function getLocalGameIds(): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
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
    console.log('Found folders:', folders.map((f: { name: string }) => f.name));

    const gameIds = folders
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .map((dirent: { name: string }) => dirent.name);

    console.log('Game folder names (uniqids):', gameIds);
    return gameIds;
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
