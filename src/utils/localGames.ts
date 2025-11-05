export async function getLocalGameIds(): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    return [];
  }

  try {
    const gamesDir = path.join(process.cwd(), 'data', 'games');

    if (!fs.existsSync(gamesDir)) {
      return [];
    }

    const folders = fs.readdirSync(gamesDir, { withFileTypes: true });

    return folders
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .map((dirent: { name: string }) => dirent.name);
  } catch (error) {
    console.error('Error reading local games:', error);
    return [];
  }
}
