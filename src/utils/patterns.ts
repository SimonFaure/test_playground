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
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    console.log('Electron fs/path not available');
    return null;
  }

  try {
    const gameMetaPath = path.join(process.cwd(), 'data', 'games', uniqid, 'csv', 'game_meta.csv');

    if (!fs.existsSync(gameMetaPath)) {
      console.log('game_meta.csv does not exist:', gameMetaPath);
      return null;
    }

    const content = fs.readFileSync(gameMetaPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 4 && parts[2] === 'game_public') {
        console.log('Found game_public:', parts[3]);
        return parts[3].trim();
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading game_meta.csv:', error);
    return null;
  }
}
