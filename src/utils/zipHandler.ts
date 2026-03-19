import JSZip from 'jszip';
import { supabase } from '../lib/db';

export interface ValidationResult {
  success: boolean;
  message?: string;
  uniqid?: string;
  gameType?: string;
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
    const lines = gameCsvContent.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        message: 'game.csv is empty or invalid.'
      };
    }

    const headers = lines[0].split(',');
    const values = lines[1].split(',');
    const gameData: Record<string, string> = {};

    headers.forEach((header, index) => {
      gameData[header.trim()] = values[index]?.trim() || '';
    });

    const uniqid = gameData.uniqid;
    const gameType = gameData.type;

    if (!uniqid) {
      return {
        success: false,
        message: 'uniqid not found in game.csv.'
      };
    }

    if (gameType === 'mystery') {
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
            message: `Missing required file for mystery game: ${requiredFileName}`
          };
        }
      }
    }

    await saveZipToDataFolder(zip, uniqid);

    return {
      success: true,
      uniqid,
      gameType
    };
  } catch (error) {
    return {
      success: false,
      message: `Error processing ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function saveZipToDataFolder(zip: JSZip, uniqid: string): Promise<void> {
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  if (isElectron) {
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;

      const isBinary = relativePath.match(/\.(png|jpg|jpeg|gif|mp3|wav|ogg)$/i);
      const content = isBinary
        ? await zipEntry.async('base64')
        : await zipEntry.async('text');

      await (window as any).electron.games.writeFile(uniqid, relativePath, content, isBinary);
    }
  } else {
    await saveZipToBrowserStorage(zip, uniqid);
  }
}

async function saveZipToBrowserStorage(zip: JSZip, uniqid: string): Promise<void> {
  let gameDataJson: Record<string, unknown> | null = null;
  const mediaFiles: Array<{ filename: string; media_type: string; data: string }> = [];

  const gameDataFile = Object.keys(zip.files).find(
    f => f.endsWith('game-data.json') || f === 'game-data.json'
  );
  if (gameDataFile && !zip.files[gameDataFile].dir) {
    const content = await zip.files[gameDataFile].async('text');
    try {
      const parsed = JSON.parse(content);
      gameDataJson = parsed.game_data !== undefined ? parsed.game_data : parsed;
    } catch {
      console.warn('[zipHandler] Failed to parse game-data.json');
    }
  }

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    if (relativePath.includes('media/')) {
      const base64Content = await zipEntry.async('base64');
      const pathAfterMedia = relativePath.substring(relativePath.indexOf('media/') + 6);

      if (relativePath.includes('images/')) {
        const pathAfterImages = pathAfterMedia.substring(pathAfterMedia.indexOf('images/') + 7);
        mediaFiles.push({
          filename: pathAfterImages,
          media_type: 'image',
          data: base64Content
        });
        console.log(`[zipHandler] Queued image: ${pathAfterImages}`);
      } else if (relativePath.includes('sounds/')) {
        const pathAfterSounds = pathAfterMedia.substring(pathAfterMedia.indexOf('sounds/') + 7);
        mediaFiles.push({
          filename: pathAfterSounds,
          media_type: 'sound',
          data: base64Content
        });
        console.log(`[zipHandler] Queued sound: ${pathAfterSounds}`);
      } else if (relativePath.includes('videos/')) {
        const pathAfterVideos = pathAfterMedia.substring(pathAfterMedia.indexOf('videos/') + 7);
        mediaFiles.push({
          filename: pathAfterVideos,
          media_type: 'video',
          data: base64Content
        });
        console.log(`[zipHandler] Queued video: ${pathAfterVideos}`);
      }
    }
  }

  let gameTitle = 'Untitled Scenario';
  let gameType = 'mystery';

  if (gameDataJson) {
    const gd = gameDataJson as any;
    if (gd.game?.title) gameTitle = gd.game.title;
    else if (gd.title) gameTitle = gd.title;

    if (gd.game?.type) gameType = gd.game.type;
    else if (gd.type) gameType = gd.type;
  }

  const { error: scenarioError } = await supabase
    .from('scenarios')
    .upsert({
      uniqid,
      title: gameTitle,
      game_type: gameType,
      game_data_json: gameDataJson,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'uniqid'
    });

  if (scenarioError) {
    console.error('Error saving scenario:', scenarioError);
    throw new Error(`Failed to save scenario: ${scenarioError.message}`);
  }

  await supabase
    .from('scenario_media')
    .delete()
    .eq('scenario_uniqid', uniqid);

  if (mediaFiles.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < mediaFiles.length; i += batchSize) {
      const batch = mediaFiles.slice(i, i + batchSize).map(m => ({
        ...m,
        scenario_uniqid: uniqid
      }));

      const { error: mediaError } = await supabase
        .from('scenario_media')
        .insert(batch);

      if (mediaError) {
        console.error('Error saving media batch:', mediaError);
        throw new Error(`Failed to save media: ${mediaError.message}`);
      }
    }
  }

  console.log(`Successfully saved scenario ${uniqid} to Supabase with ${mediaFiles.length} media files`);
}
