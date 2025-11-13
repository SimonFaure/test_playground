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

export interface PatternEnigma {
  id: string;
  pattern_id: string;
  enigma_id: string;
  good_answers: string[];
  wrong_answers: string[];
}

function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
    const obj: any = {};

    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      obj[header.trim()] = value;
    });

    result.push(obj);
  }

  return result;
}

export async function loadPatternEnigmas(gameTypeName: string, patternName: string): Promise<PatternEnigma[]> {
  try {
    if (window.electron?.patterns?.readFile) {
      const csvContent = await window.electron.patterns.readFile(gameTypeName, patternName, 'patterns_survival_balises.csv');
      const parsed = parseCSV(csvContent);

      return parsed.map((row: any) => ({
        id: row.id,
        pattern_id: row.pattern_id,
        enigma_id: row.enigma_id,
        good_answers: JSON.parse(row.good_answers || '[]'),
        wrong_answers: JSON.parse(row.wrong_answers || '[]'),
      }));
    }

    console.warn('Electron patterns API not available');
    return [];
  } catch (error) {
    console.error('Error loading pattern enigmas:', error);
    return [];
  }
}

export { readGameDataFile };
