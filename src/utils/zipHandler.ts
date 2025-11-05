import JSZip from 'jszip';
import { db } from '../lib/db';

export interface ValidationResult {
  success: boolean;
  message?: string;
  uniqid?: string;
  gameType?: string;
}

interface GameCSVData {
  uniqid: string;
  type: string;
  title: string;
  description: string;
  difficulty?: string;
  duration_minutes?: number;
  slug?: string;
  origin?: string;
}

export async function validateAndExtractZip(file: File): Promise<ValidationResult> {
  try {
    const zip = await JSZip.loadAsync(file);
    const fileList = Object.keys(zip.files);

    console.log('Files in ZIP:', fileList);

    const hasCsvFolder = fileList.some(f => f.includes('csv/') || f === 'csv' || f === 'csv/');
    const hasMediaFolder = fileList.some(f => f.includes('media/') || f === 'media' || f === 'media/');

    if (!hasCsvFolder || !hasMediaFolder) {
      return {
        success: false,
        message: `Invalid folder structure. ZIP must contain "csv" and "media" folders. Found: ${fileList.slice(0, 5).join(', ')}`
      };
    }

    let gameCsvFile = zip.files['csv/game.csv'];

    if (!gameCsvFile) {
      const gameCsvPath = fileList.find(f => f.endsWith('csv/game.csv') || f.endsWith('/csv/game.csv'));
      if (gameCsvPath) {
        gameCsvFile = zip.files[gameCsvPath];
      }
    }

    if (!gameCsvFile) {
      return {
        success: false,
        message: `game.csv not found in csv folder. Files found: ${fileList.filter(f => f.includes('.csv')).join(', ')}`
      };
    }

    const gameCsvContent = await gameCsvFile.async('text');
    const gameData = parseGameCSV(gameCsvContent);

    if (!gameData) {
      return {
        success: false,
        message: 'game.csv is empty or invalid.'
      };
    }

    const { uniqid, type: gameType } = gameData;

    if (gameType === 'survival') {
      const requiredFiles = [
        'game_enigmas.csv',
        'game_media_images.csv',
        'game_meta.csv',
        'game_sounds.csv',
        'game_user_meta.csv'
      ];

      for (const requiredFileName of requiredFiles) {
        const found = fileList.some(f => f.endsWith(`csv/${requiredFileName}`) || f.endsWith(`/${requiredFileName}`));
        if (!found) {
          return {
            success: false,
            message: `Missing required file for survival game: ${requiredFileName}`
          };
        }
      }
    }

    await saveToSupabase(zip, fileList, gameData);

    return {
      success: true,
      uniqid,
      gameType
    };
  } catch (error) {
    console.error('ZIP processing error:', error);
    return {
      success: false,
      message: `Error processing ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function parseGameCSV(csvContent: string): GameCSVData | null {
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const values = lines[1].split(',').map(v => v.trim());

  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    data[header] = values[index] || '';
  });

  if (!data.uniqid || !data.type) {
    return null;
  }

  return {
    uniqid: data.uniqid,
    type: data.type,
    title: data.title || data.uniqid,
    description: data.description || '',
    difficulty: data.difficulty,
    duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : undefined,
    slug: data.slug,
    origin: data.origin
  };
}

async function saveToSupabase(zip: JSZip, fileList: string[], gameData: GameCSVData): Promise<void> {
  const gameTypeResult = await db.getGameTypeByName(gameData.type);

  if (!gameTypeResult) {
    throw new Error(`Game type '${gameData.type}' not found in database. Please add it first.`);
  }

  const scenarioData = {
    uniqid: gameData.uniqid,
    game_type_id: gameTypeResult.id,
    title: gameData.title,
    description: gameData.description,
    difficulty: gameData.difficulty || 'Medium',
    duration_minutes: gameData.duration_minutes || 30,
    slug: gameData.slug,
    origin: gameData.origin
  };

  const scenario = await db.createScenario(scenarioData);

  const csvFiles = fileList.filter(f => f.endsWith('.csv') && !zip.files[f].dir);

  for (const csvPath of csvFiles) {
    const fileName = csvPath.split('/').pop() || csvPath;
    const content = await zip.files[csvPath].async('text');

    await db.createScenarioFile({
      scenario_id: scenario.id,
      file_name: fileName,
      file_content: content
    });
  }

  const mediaFiles = fileList.filter(f =>
    f.includes('media/') &&
    !zip.files[f].dir &&
    /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|mp4)$/i.test(f)
  );

  for (const mediaPath of mediaFiles) {
    const fileBlob = await zip.files[mediaPath].async('blob');
    const fileName = mediaPath.split('/').pop() || mediaPath;
    const storagePath = `${gameData.uniqid}/${fileName}`;

    await db.uploadMediaFile(storagePath, fileBlob);
  }
}
