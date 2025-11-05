export async function getPatternFolders(): Promise<string[]> {
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    console.log('Electron fs/path not available, using default patterns');
    return ['ado-adultes', 'kids', 'mini-kids'];
  }

  try {
    const patternsDir = path.join(process.cwd(), 'data', 'patterns');

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
