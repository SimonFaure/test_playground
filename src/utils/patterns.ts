import { supabase } from '../lib/db';

const DEFAULT_PATTERN_FOLDERS = ['ado_adultes', 'kids', 'mini_kids'];

export async function getPatternFolders(gameTypeName: string): Promise<string[]> {
  if (window.electron?.patterns?.listFolders) {
    try {
      const folders = await window.electron.patterns.listFolders(gameTypeName);
      console.log('Pattern folders found:', folders);
      return folders;
    } catch (error) {
      console.error('Error reading pattern folders:', error);
      return DEFAULT_PATTERN_FOLDERS;
    }
  }

  try {
    const { data: patterns, error } = await supabase
      .from('patterns')
      .select('slug')
      .eq('game_type', gameTypeName);

    if (error) {
      console.warn('Error fetching patterns from Supabase:', error);
      return DEFAULT_PATTERN_FOLDERS;
    }

    const uploadedSlugs = (patterns || []).map((p: { slug: string }) => p.slug);
    const merged = [...DEFAULT_PATTERN_FOLDERS];
    for (const slug of uploadedSlugs) {
      if (!merged.includes(slug)) merged.push(slug);
    }
    return merged;
  } catch (err) {
    console.warn('Error fetching pattern folders:', err);
    return DEFAULT_PATTERN_FOLDERS;
  }
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
    const { data } = supabase.storage
      .from('resources')
      .getPublicUrl(`scenarios/${uniqid}/game-data.json`);

    const response = await fetch(data.publicUrl);
    if (response.ok) {
      return await response.json();
    }

    const fallbackResponse = await fetch(`/data/games/${uniqid}/game-data.json`);
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch game data: ${fallbackResponse.statusText}`);
    }
    return await fallbackResponse.json();
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

async function readPatternFileFromStorage(gameTypeName: string, patternName: string, filename: string): Promise<string> {
  const extensions = ['csv', 'json'];

  for (const ext of extensions) {
    const storagePath = `patterns/${gameTypeName}/${patternName}.${ext}`;
    const { data } = supabase.storage.from('resources').getPublicUrl(storagePath);

    const response = await fetch(data.publicUrl);
    if (response.ok) {
      return await response.text();
    }
  }

  const localResponse = await fetch(`/data/patterns/${gameTypeName}/${patternName}/${filename}`);
  if (!localResponse.ok) {
    throw new Error(`Pattern file not found: ${gameTypeName}/${patternName}/${filename}`);
  }
  return await localResponse.text();
}

export async function loadPatternEnigmas(gameTypeName: string, patternName: string): Promise<PatternEnigma[]> {
  try {
    if (window.electron?.patterns?.readFile) {
      const csvContent = await window.electron.patterns.readFile(gameTypeName, patternName, 'patterns_survival_balises.csv');
      const parsed = parseCSV(csvContent);

      return parsed.map((row: any) => {
        let goodAnswers: string[] = [];
        let wrongAnswers: string[] = [];

        try {
          const goodAnswersStr = row.good_answers || '[]';
          const fixedGoodAnswers = goodAnswersStr.replace(/""/g, '"');
          goodAnswers = JSON.parse(fixedGoodAnswers);
        } catch (e) {
          console.warn('Error parsing good_answers for row', row.id, ':', e);
          goodAnswers = [];
        }

        try {
          const wrongAnswersStr = row.wrong_answers || '[]';
          const fixedWrongAnswers = wrongAnswersStr.replace(/""/g, '"');
          wrongAnswers = JSON.parse(fixedWrongAnswers);
        } catch (e) {
          console.warn('Error parsing wrong_answers for row', row.id, ':', e);
          wrongAnswers = [];
        }

        return {
          id: row.id,
          pattern_id: row.pattern_id,
          enigma_id: row.enigma_id,
          good_answers: goodAnswers,
          wrong_answers: wrongAnswers,
        };
      });
    }

    const csvContent = await readPatternFileFromStorage(gameTypeName, patternName, 'patterns_survival_balises.csv');
    const parsed = parseCSV(csvContent);

    return parsed.map((row: any) => {
      let goodAnswers: string[] = [];
      let wrongAnswers: string[] = [];

      try {
        const goodAnswersStr = row.good_answers || '[]';
        const fixedGoodAnswers = goodAnswersStr.replace(/""/g, '"');
        goodAnswers = JSON.parse(fixedGoodAnswers);
      } catch (e) {
        goodAnswers = [];
      }

      try {
        const wrongAnswersStr = row.wrong_answers || '[]';
        const fixedWrongAnswers = wrongAnswersStr.replace(/""/g, '"');
        wrongAnswers = JSON.parse(fixedWrongAnswers);
      } catch (e) {
        wrongAnswers = [];
      }

      return {
        id: row.id,
        pattern_id: row.pattern_id,
        enigma_id: row.enigma_id,
        good_answers: goodAnswers,
        wrong_answers: wrongAnswers,
      };
    });
  } catch (error) {
    console.error('Error loading pattern enigmas:', error);
    return [];
  }
}

export { readGameDataFile };
