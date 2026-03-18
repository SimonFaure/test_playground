import JSZip from 'jszip';

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
      const imagesFolder = zip.folder('images');
      if (imagesFolder) {
        const imageFiles = imagesFolder.file(/.+\.(jpg|jpeg|png|gif|webp)$/i);
        for (const imageFile of imageFiles) {
          const imageData = await imageFile.async('uint8array');
          images[imageFile.name.split('/').pop() || ''] = imageData;
        }
      }

      const sounds: Record<string, Uint8Array> = {};
      const soundsFolder = zip.folder('sounds');
      if (soundsFolder) {
        const soundFiles = soundsFolder.file(/.+\.(mp3|wav|ogg)$/i);
        for (const soundFile of soundFiles) {
          const soundData = await soundFile.async('uint8array');
          sounds[soundFile.name.split('/').pop() || ''] = soundData;
        }
      }

      const videos: Record<string, Uint8Array> = {};
      const videosFolder = zip.folder('videos');
      if (videosFolder) {
        const videoFiles = videosFolder.file(/.+\.(mp4|webm)$/i);
        for (const videoFile of videoFiles) {
          const videoData = await videoFile.async('uint8array');
          videos[videoFile.name.split('/').pop() || ''] = videoData;
        }
      }

      const gameName = gameData?.game?.title || gameData?.scenario?.name || 'Unknown Game';
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

    return {
      type: 'unknown',
      name: file.name,
      data,
      isValid: false,
      error: 'JSON file type detection not fully implemented. Please use ZIP format for games.'
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
      return {
        type: 'pattern',
        name: file.name,
        data: { csvContent: text },
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
  if (!electron) {
    throw new Error('Electron API not available');
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
  console.log('Pattern save not yet implemented:', data);
  throw new Error('Pattern upload is not yet implemented');
}

async function saveCards(data: any): Promise<void> {
  console.log('Cards save not yet implemented:', data);
  throw new Error('Cards upload is not yet implemented');
}

async function saveLayout(data: any): Promise<void> {
  console.log('Layout save not yet implemented:', data);
  throw new Error('Layout upload is not yet implemented');
}
