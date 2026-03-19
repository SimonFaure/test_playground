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

      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        const mediaFiles = mediaFolder.file(/.+/);
        console.log('[fileUpload] Found media files:', mediaFiles.map(f => f.name));

        for (const mediaFile of mediaFiles) {
          const fileName = mediaFile.name.toLowerCase();
          const mediaData = await mediaFile.async('uint8array');
          const relativePath = mediaFile.name.replace(/^media\//, '');

          if (!relativePath || relativePath.includes('/')) continue;

          if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            console.log(`[fileUpload] Storing image: ${relativePath}`);
            images[relativePath] = mediaData;
          } else if (fileName.match(/\.(mp3|wav|ogg)$/i)) {
            console.log(`[fileUpload] Storing sound: ${relativePath}`);
            sounds[relativePath] = mediaData;
          } else if (fileName.match(/\.(mp4|webm|ogv)$/i)) {
            console.log(`[fileUpload] Storing video: ${relativePath}`);
            videos[relativePath] = mediaData;
          }
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
          fileName: file.name
        },
        isValid: true
      };
    }

    if (fileName.includes('layout')) {
      return {
        type: 'layout',
        name: file.name,
        data: { layoutData: data, fileName: file.name },
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
          fileName: file.name
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
        data: { csvContent: text },
        isValid: true
      };
    } else if (fileName.includes('layout')) {
      return {
        type: 'layout',
        name: file.name,
        data: { csvContent: text },
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
      throw new Error('Card uploads are not yet supported in web version. Use the Electron app for card uploads.');
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
  const { patternData, patternSlug, fileName, csvContent } = data;

  const patternStorageKey = `pattern_${patternSlug}`;

  if (csvContent) {
    localStorage.setItem(patternStorageKey, csvContent);
  } else if (patternData) {
    localStorage.setItem(patternStorageKey, JSON.stringify(patternData));
  } else {
    throw new Error('No pattern data or CSV content found');
  }

  const patternsListKey = 'uploaded_patterns_list';
  const patternsList = JSON.parse(localStorage.getItem(patternsListKey) || '[]');

  if (!patternsList.includes(patternSlug)) {
    patternsList.push(patternSlug);
    localStorage.setItem(patternsListKey, JSON.stringify(patternsList));
  }

  console.log(`Pattern ${patternSlug} saved to browser storage`);
}

async function saveCards(data: any): Promise<void> {
  console.log('Cards save not yet implemented:', data);
  throw new Error('Cards upload is not yet implemented');
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
  const { layoutData, gameType, version, fileName } = data;

  const layoutIdentifier = fileName
    ? fileName.replace('.json', '')
    : (layoutData.name || layoutData.id || `layout_${Date.now()}`);

  const layoutStorageKey = `layout_${layoutIdentifier}`;

  const layoutWithMetadata = {
    ...layoutData,
    _metadata: {
      gameType,
      version,
      fileName,
      uploadedAt: new Date().toISOString()
    }
  };

  localStorage.setItem(layoutStorageKey, JSON.stringify(layoutWithMetadata));

  const layoutsListKey = 'uploaded_layouts_list';
  const layoutsList = JSON.parse(localStorage.getItem(layoutsListKey) || '[]');

  if (!layoutsList.includes(layoutIdentifier)) {
    layoutsList.push(layoutIdentifier);
    localStorage.setItem(layoutsListKey, JSON.stringify(layoutsList));
  }

  console.log(`Layout ${layoutIdentifier} saved to browser storage`);
}

async function saveGameWeb(data: any): Promise<void> {
  const { uniqid, gameData, csvFiles, images, sounds, videos } = data;

  const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  };

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

  const { error: deleteError } = await supabase
    .from('scenario_media')
    .delete()
    .eq('scenario_uniqid', uniqid);

  if (deleteError) {
    console.warn('Error deleting old media:', deleteError);
  }

  const mediaRecords = [];

  for (const [filename, data] of Object.entries(images)) {
    mediaRecords.push({
      scenario_uniqid: uniqid,
      filename,
      media_type: 'image',
      data: uint8ArrayToBase64(data as Uint8Array)
    });
  }

  for (const [filename, data] of Object.entries(sounds)) {
    mediaRecords.push({
      scenario_uniqid: uniqid,
      filename,
      media_type: 'sound',
      data: uint8ArrayToBase64(data as Uint8Array)
    });
  }

  for (const [filename, data] of Object.entries(videos)) {
    mediaRecords.push({
      scenario_uniqid: uniqid,
      filename,
      media_type: 'video',
      data: uint8ArrayToBase64(data as Uint8Array)
    });
  }

  if (mediaRecords.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < mediaRecords.length; i += batchSize) {
      const batch = mediaRecords.slice(i, i + batchSize);
      const { error: mediaError } = await supabase
        .from('scenario_media')
        .insert(batch);

      if (mediaError) {
        console.error('Error saving media batch:', mediaError);
        throw new Error(`Failed to save media: ${mediaError.message}`);
      }
    }
  }

  console.log(`Successfully saved scenario ${uniqid} to Supabase`);
}
