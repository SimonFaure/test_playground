import JSZip from 'jszip';

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

    const csvFolder = fileList.find(f => f.startsWith('csv/') || f === 'csv');
    const mediaFolder = fileList.find(f => f.startsWith('media/') || f === 'media');

    if (!csvFolder || !mediaFolder) {
      return {
        success: false,
        message: 'Invalid folder structure. ZIP must contain "csv" and "media" folders.'
      };
    }

    const gameCsvFile = zip.files['csv/game.csv'];
    if (!gameCsvFile) {
      return {
        success: false,
        message: 'game.csv not found in csv folder.'
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

    if (gameType === 'survival') {
      const requiredFiles = [
        'csv/game_enigmas.csv',
        'csv/game_media_images.csv',
        'csv/game_meta.csv',
        'csv/game_sounds.csv',
        'csv/game_user_meta.csv'
      ];

      for (const requiredFile of requiredFiles) {
        if (!zip.files[requiredFile]) {
          return {
            success: false,
            message: `Missing required file for survival game: ${requiredFile}`
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
  const fs = window.require?.('fs');
  const path = window.require?.('path');

  if (!fs || !path) {
    throw new Error('File system access not available. This feature requires the Electron app.');
  }

  const dataDir = path.join(process.cwd(), 'data', uniqid);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;

    const content = await zipEntry.async('nodebuffer');
    const filePath = path.join(dataDir, relativePath);
    const fileDir = path.dirname(filePath);

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content);
  }
}
