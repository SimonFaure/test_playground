export async function getLocalGameIds(): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    console.log('Electron fs/path not available');
    return [];
  }

  try {
    const gamesDir = path.join(process.cwd(), 'data', 'games');

    if (!fs.existsSync(gamesDir)) {
      console.log('Games directory does not exist:', gamesDir);
      return [];
    }

    const folders = fs.readdirSync(gamesDir, { withFileTypes: true });
    const localGameIds = folders
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .map((dirent: { name: string }) => dirent.name);

    console.log('Local game folders found:', localGameIds);
    return localGameIds;
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
