import JSZip from 'jszip';
import { supabase } from '../lib/db';

export type FileType = 'game' | 'pattern' | 'cards' | 'layout' | 'unknown';

export interface UploadResult {
  type: FileType;
  name: string;
  data: any;
  isValid: boolean;
  error?: string;
}

export async function detectFileType(file: File): Promise<UploadResult> {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();

  if (fileExtension === 'zip') {
    return await handleZipFile(file);
  } else if (fileExtension === 'json') {
    return await handleJsonFile(file);
  } else if (fileExtension === 'csv') {
    return await handleCsvFile(file, fileName);
  } else {
    return {
      type: 'unknown',
      name: file.name,
      data: null,
      isValid: false,
      error: 'Unsupported file type. Please upload a ZIP, JSON, or CSV file.'
    };
  }
}

async function handleZipFile(file: File): Promise<UploadResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const hasGameData = zip.file('game-data.json') !== null;
    const csvFolder = zip.folder('csv');
    const hasCsvFolder = csvFolder !== null;

    if (hasGameData && hasCsvFolder) {
      const gameDataFile = zip.file('game-data.json');
      if (!gameDataFile) {
        return {
          type: 'unknown',
          name: file.name,
          data: null,
          isValid: false,
          error: 'Invalid game structure: game-data.json not found'
        };
      }

      const gameDataContent = await gameDataFile.async('string');
      const gameData = JSON.parse(gameDataContent);

      const csvFiles: Record<string, string> = {};
      const csvFilesList = csvFolder.file(/.+\.csv$/);

      for (const csvFile of csvFilesList) {
        const csvContent = await csvFile.async('string');
        csvFiles[csvFile.name.split('/').pop() || ''] = csvContent;
      }

      const images: Record<string, Uint8Array> = {};
      const sounds: Record<string, Uint8Array> = {};
      const videos: Record<string, Uint8Array> = {};

      const gameUniqid = gameData?.game?.uniqid || gameData?.scenario?.uniqid;

      const mediaPrefixesToTry = [
        'media/',
        `${gameUniqid}/media/`
      ].filter(Boolean);

      let mediaFiles: JSZip.JSZipObject[] = [];
      let usedPrefix = '';

      for (const prefix of mediaPrefixesToTry) {
        const folder = zip.folder(prefix.replace(/\/$/, ''));
        if (folder) {
          const found = folder.file(/.+/);
          if (found.length > 0) {
            mediaFiles = found;
            usedPrefix = prefix;
            break;
          }
        }
      }

      if (mediaFiles.length === 0) {
        const allFiles = zip.file(/.+/);
        const mediaMatches = allFiles.filter(f => f.name.includes('/media/'));
        if (mediaMatches.length > 0) {
          mediaFiles = mediaMatches;
          const firstMatch = mediaMatches[0].name;
          const mediaIdx = firstMatch.indexOf('/media/');
          usedPrefix = firstMatch.substring(0, mediaIdx + '/media/'.length);
        }
      }

      console.log('[fileUpload] Found media files:', mediaFiles.map(f => f.name));

      for (const mediaFile of mediaFiles) {
        const lowerName = mediaFile.name.toLowerCase();
        const mediaData = await mediaFile.async('uint8array');
        const relativePath = mediaFile.name.replace(usedPrefix, '');

        if (!relativePath || relativePath.includes('/')) continue;

        if (lowerName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          console.log(`[fileUpload] Storing image: ${relativePath}`);
          images[relativePath] = mediaData;
        } else if (lowerName.match(/\.(mp3|wav|ogg)$/i)) {
          console.log(`[fileUpload] Storing sound: ${relativePath}`);
          sounds[relativePath] = mediaData;
        } else if (lowerName.match(/\.(mp4|webm|ogv)$/i)) {
          console.log(`[fileUpload] Storing video: ${relativePath}`);
          videos[relativePath] = mediaData;
        }
      }

      console.log('[fileUpload] Total images stored:', Object.keys(images).length);
      console.log('[fileUpload] Total sounds stored:', Object.keys(sounds).length);
      console.log('[fileUpload] Total videos stored:', Object.keys(videos).length);

      const gameName = gameData?.game?.title || gameData?.scenario?.title || gameData?.scenario?.name || 'Unknown Game';
      const uniqid = gameData?.game?.uniqid || gameData?.scenario?.uniqid;

      if (!uniqid) {
        return {
          type: 'unknown',
          name: file.name,
          data: null,
          isValid: false,
          error: 'Invalid game structure: uniqid not found in game data'
        };
      }

      return {
        type: 'game',
        name: gameName,
        data: {
          uniqid,
          gameData,
          gameDataRaw: gameDataContent,
          csvFiles,
          images,
          sounds,
          videos
        },
        isValid: true
      };
    } else {
      return {
        type: 'unknown',
        name: file.name,
        data: null,
        isValid: false,
        error: 'Invalid ZIP structure. Expected game-data.json and csv folder for a game.'
      };
    }
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    return {
      type: 'unknown',
      name: file.name,
      data: null,
      isValid: false,
      error: `Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleJsonFile(file: File): Promise<UploadResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const fileName = file.name.toLowerCase();

    const layoutPattern = /^[^_]+_layout_[^.]+\.json$/;
    if (layoutPattern.test(fileName)) {
      const [gameType, , version] = file.name.replace('.json', '').split('_');
      return {
        type: 'layout',
        name: file.name,
        data: {
          layoutData: data,
          gameType,
          version,
          fileName: file.name,
          rawContent: text
        },
        isValid: true
      };
    }

    if (fileName.includes('layout')) {
      return {
        type: 'layout',
        name: file.name,
        data: { layoutData: data, fileName: file.name, rawContent: text },
        isValid: true
      };
    }

    const patternPattern = /^pattern_[^.]+\.json$/;
    if (patternPattern.test(fileName)) {
      const patternSlug = file.name.replace('pattern_', '').replace('.json', '');
      return {
        type: 'pattern',
        name: file.name,
        data: {
          patternData: data,
          patternSlug,
          fileName: file.name,
          rawContent: text
        },
        isValid: true
      };
    }

    return {
      type: 'unknown',
      name: file.name,
      data,
      isValid: false,
      error: 'Cannot determine JSON file type. Expected format: "{game_type}_layout_{version}.json" or "pattern_{pattern_slug}.json".'
    };
  } catch (error) {
    console.error('Error processing JSON file:', error);
    return {
      type: 'unknown',
      name: file.name,
      data: null,
      isValid: false,
      error: `Invalid JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleCsvFile(file: File, fileName: string): Promise<UploadResult> {
  try {
    const text = await file.text();

    if (fileName.includes('pattern')) {
      const patternSlug = file.name.replace('.csv', '').replace(/^pattern_?/, '') || file.name.replace('.csv', '');
      return {
        type: 'pattern',
        name: file.name,
        data: { csvContent: text, patternSlug, fileName: file.name },
        isValid: true
      };
    } else if (fileName.includes('card') || fileName.includes('client')) {
      return {
        type: 'cards',
        name: file.name,
        data: { csvContent: text, fileName: file.name },
        isValid: true
      };
    } else if (fileName.includes('layout')) {
      return {
        type: 'layout',
        name: file.name,
        data: { csvContent: text, fileName: file.name },
        isValid: true
      };
    } else {
      return {
        type: 'unknown',
        name: file.name,
        data: { csvContent: text },
        isValid: false,
        error: 'Cannot determine CSV file type. Filename should contain "pattern", "card"/"client", or "layout".'
      };
    }
  } catch (error) {
    console.error('Error processing CSV file:', error);
    return {
      type: 'unknown',
      name: file.name,
      data: null,
      isValid: false,
      error: `Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function saveUploadedFile(result: UploadResult): Promise<void> {
  if (!result.isValid || !result.data) {
    throw new Error(result.error || 'Invalid upload result');
  }

  const electron = (window as any).electron;
  const isElectron = electron && electron.isElectron;

  if (!isElectron) {
    if (result.type === 'game') {
      await saveGameWeb(result.data);
    } else if (result.type === 'pattern') {
      await savePatternWeb(result.data);
    } else if (result.type === 'layout') {
      await saveLayoutWeb(result.data);
    } else if (result.type === 'cards') {
      await saveCardsWeb(result.data);
    } else {
      throw new Error(`Cannot save file of type: ${result.type}`);
    }
    return;
  }

  switch (result.type) {
    case 'game':
      await saveGame(result.data);
      break;
    case 'pattern':
      await savePattern(result.data);
      break;
    case 'cards':
      await saveCards(result.data);
      break;
    case 'layout':
      await saveLayout(result.data);
      break;
    default:
      throw new Error(`Cannot save file of type: ${result.type}`);
  }
}

async function saveGame(data: any): Promise<void> {
  const { uniqid, gameData, csvFiles, images, sounds, videos } = data;
  const electron = (window as any).electron;

  await electron.scenarios.saveGameData(uniqid, gameData);

  for (const [filename, content] of Object.entries(csvFiles)) {
    await electron.scenarios.saveCsv(uniqid, filename, content as string);
  }

  for (const [filename, data] of Object.entries(images)) {
    const base64 = btoa(String.fromCharCode(...(data as Uint8Array)));
    await electron.scenarios.saveMedia(uniqid, 'images', filename, base64);
  }

  for (const [filename, data] of Object.entries(sounds)) {
    const base64 = btoa(String.fromCharCode(...(data as Uint8Array)));
    await electron.scenarios.saveMedia(uniqid, 'sounds', filename, base64);
  }

  for (const [filename, data] of Object.entries(videos)) {
    const base64 = btoa(String.fromCharCode(...(data as Uint8Array)));
    await electron.scenarios.saveMedia(uniqid, 'videos', filename, base64);
  }

  await electron.scenarios.refresh();
}

async function savePattern(data: any): Promise<void> {
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  if (isElectron) {
    await savePatternElectron(data);
  } else {
    await savePatternWeb(data);
  }
}

async function savePatternElectron(data: any): Promise<void> {
  const electron = (window as any).electron;
  const { patternData, patternSlug, fileName, csvContent } = data;

  if (csvContent) {
    await electron.patterns?.saveCsv(patternSlug, csvContent);
  } else if (patternData) {
    await electron.patterns?.save(patternSlug, patternData);
  } else {
    throw new Error('No pattern data or CSV content found');
  }

  console.log(`Pattern ${patternSlug} saved to Electron storage`);
}

async function savePatternWeb(data: any): Promise<void> {
  const { patternData, patternSlug, fileName, csvContent, rawContent } = data;

  const isJson = !!rawContent || !!patternData;
  const fileContent = rawContent || csvContent || JSON.stringify(patternData);
  const ext = isJson && !csvContent ? 'json' : 'csv';

  let gameType = 'mystery';
  if (patternData?.game_type) {
    gameType = patternData.game_type;
  } else if (csvContent) {
    const firstLine = csvContent.split('\n')[0] || '';
    const headers = firstLine.split(',');
    const gameTypeIndex = headers.indexOf('game_type');
    if (gameTypeIndex !== -1) {
      const secondLine = csvContent.split('\n')[1] || '';
      const values = secondLine.split(',');
      if (values[gameTypeIndex]) {
        gameType = values[gameTypeIndex].trim().replace(/^"|"$/g, '');
      }
    }
  }

  const storagePath = `patterns/${gameType}/${patternSlug}.${ext}`;
  const blob = new Blob([fileContent], { type: ext === 'json' ? 'application/json' : 'text/csv' });

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(storagePath, blob, { upsert: true, contentType: blob.type });

  if (uploadError) {
    console.error('Error uploading pattern to storage:', uploadError);
    throw new Error(`Failed to upload pattern: ${uploadError.message}`);
  }

  const { error: upsertError } = await supabase
    .from('patterns')
    .upsert({
      slug: patternSlug,
      name: patternSlug,
      game_type: gameType,
    }, { onConflict: 'slug' });

  if (upsertError) {
    console.warn('Error upserting pattern record:', upsertError);
  }

  console.log(`Pattern ${patternSlug} saved to Supabase Storage at ${storagePath}`);
}

async function saveCards(data: any): Promise<void> {
  console.log('Cards save not yet implemented:', data);
  throw new Error('Cards upload is not yet implemented');
}

async function saveCardsWeb(data: any): Promise<void> {
  const { csvContent, fileName } = data;

  const storagePath = `cards/${fileName}`;
  const blob = new Blob([csvContent], { type: 'text/csv' });

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(storagePath, blob, { upsert: true, contentType: 'text/csv' });

  if (uploadError) {
    console.error('Error uploading cards to storage:', uploadError);
    throw new Error(`Failed to upload cards: ${uploadError.message}`);
  }

  console.log(`Cards file ${fileName} saved to Supabase Storage at ${storagePath}`);
}

async function saveLayout(data: any): Promise<void> {
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  if (isElectron) {
    await saveLayoutElectron(data);
  } else {
    await saveLayoutWeb(data);
  }
}

async function saveLayoutElectron(data: any): Promise<void> {
  const electron = (window as any).electron;
  const { layoutData, gameType, version, fileName } = data;

  const layoutIdentifier = fileName
    ? fileName.replace('.json', '')
    : (layoutData.name || layoutData.id || 'layout');

  await electron.layouts?.save(layoutIdentifier, layoutData);

  console.log(`Layout ${layoutIdentifier} saved to Electron storage`);
}

async function saveLayoutWeb(data: any): Promise<void> {
  const { layoutData, gameType, version, fileName, rawContent } = data;

  const storagePath = `layouts/${fileName || `${gameType}_layout_${version || Date.now()}.json`}`;
  const fileContent = rawContent || JSON.stringify(layoutData);
  const blob = new Blob([fileContent], { type: 'application/json' });

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(storagePath, blob, { upsert: true, contentType: 'application/json' });

  if (uploadError) {
    console.error('Error uploading layout to storage:', uploadError);
    throw new Error(`Failed to upload layout: ${uploadError.message}`);
  }

  if (gameType && version) {
    const { error: upsertError } = await supabase
      .from('layouts')
      .upsert({
        game_type: gameType,
        version,
        name: fileName ? fileName.replace('.json', '') : `${gameType} ${version}`,
        config: layoutData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'game_type,version' });

    if (upsertError) {
      console.warn('Error upserting layout record:', upsertError);
    }
  }

  console.log(`Layout saved to Supabase Storage at ${storagePath}`);
}

async function saveGameWeb(data: any): Promise<void> {
  const { uniqid, gameData, gameDataRaw, csvFiles, images, sounds, videos } = data;

  const gameDataContent = gameDataRaw || JSON.stringify(gameData);
  const gameDataBlob = new Blob([gameDataContent], { type: 'application/json' });

  const { error: gameDataUploadError } = await supabase.storage
    .from('resources')
    .upload(`scenarios/${uniqid}/game-data.json`, gameDataBlob, {
      upsert: true,
      contentType: 'application/json'
    });

  if (gameDataUploadError) {
    console.error('Error uploading game-data.json:', gameDataUploadError);
    throw new Error(`Failed to upload game-data.json: ${gameDataUploadError.message}`);
  }

  for (const [filename, content] of Object.entries(csvFiles)) {
    const csvBlob = new Blob([content as string], { type: 'text/csv' });
    const { error: csvError } = await supabase.storage
      .from('resources')
      .upload(`scenarios/${uniqid}/${filename}`, csvBlob, {
        upsert: true,
        contentType: 'text/csv'
      });

    if (csvError) {
      console.error(`Error uploading CSV ${filename}:`, csvError);
    }
  }

  let title = 'Untitled Scenario';
  let description = '';
  let game_type = 'mystery';

  if (gameData.game && gameData.game.title) {
    title = gameData.game.title;
  } else if (gameData.scenario && gameData.scenario.title) {
    title = gameData.scenario.title;
  } else if (gameData.title) {
    title = gameData.title;
  }

  if (gameData.game_meta && gameData.game_meta.scenario) {
    description = gameData.game_meta.scenario;
  } else if (gameData.scenario?.description) {
    description = gameData.scenario.description;
  } else if (gameData.description) {
    description = gameData.description;
  }

  if (gameData.game?.type) {
    game_type = gameData.game.type;
  } else if (gameData.scenario?.game_type) {
    game_type = gameData.scenario.game_type;
  } else if (gameData.game_type) {
    game_type = gameData.game_type;
  }

  const { error: scenarioError } = await supabase
    .from('scenarios')
    .upsert({
      uniqid,
      title,
      description,
      game_type,
      version: gameData.version || gameData.game_meta?.game_version || gameData.game_data?.game_meta?.scenario_version || '1.0',
      duration_minutes: gameData.duration_minutes || 60,
      difficulty: gameData.difficulty || 'medium',
      game_data_json: gameData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'uniqid'
    });

  if (scenarioError) {
    console.error('Error saving scenario:', scenarioError);
    throw new Error(`Failed to save scenario: ${scenarioError.message}`);
  }

  const uploadMedia = async (mediaFiles: Record<string, Uint8Array>, subfolder: string, mediaType: string) => {
    for (const [filename, fileData] of Object.entries(mediaFiles)) {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg'
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';

      const { error: mediaUploadError } = await supabase.storage
        .from('resources')
        .upload(`scenarios/${uniqid}/${subfolder}/${filename}`, fileData, {
          upsert: true,
          contentType
        });

      if (mediaUploadError) {
        console.error(`Error uploading media ${filename}:`, mediaUploadError);
      }
    }
  };

  await uploadMedia(images, 'images', 'image');
  await uploadMedia(sounds, 'sounds', 'sound');
  await uploadMedia(videos, 'videos', 'video');

  console.log(`Successfully saved scenario ${uniqid} to Supabase Storage`);
}
