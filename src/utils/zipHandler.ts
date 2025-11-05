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
