import { logApiCall } from './apiLogger';

const API_BASE_URL = 'https://admin.taghunter.fr/backend/api';

export interface ScenarioSummary {
  id: number;
  title: string;
  description: string;
  game_type: string;
  scenario_type: string;
  uniqid: string;
  available_for_purchase?: boolean;
}

export interface MediaFile {
  filename: string;
  folder: string;
}

export interface GameData {
  scenario: {
    id: number;
    name: string;
    uniqid: string;
    scenario_type: string;
  };
  game_data: {
    game_meta?: any;
    translations?: any;
    [key: string]: any;
  };
  medias: {
    images?: Record<string, string>;
    levels?: Record<string, any>;
    sounds?: Record<string, string>;
    videos?: Record<string, string>;
    enigmas?: any[];
    [key: string]: any;
  };
  [key: string]: any;
}

export async function getUserScenarios(email: string): Promise<ScenarioSummary[]> {
  const url = `${API_BASE_URL}/playground.php?action=get_user_scenarios&email=${encodeURIComponent(email)}`;

  console.log('[getUserScenarios] Starting API call to:', url);

  try {
    const requestHeaders = { credentials: 'include' };
    console.log('[getUserScenarios] Making fetch request...');

    const response = await fetch(url, { credentials: 'include' });
    console.log('[getUserScenarios] Response received:', response.status, response.statusText);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      console.error('[getUserScenarios] Request failed:', response.status, response.statusText);
      await logApiCall({
        endpoint: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        requestParams: { email },
        requestHeaders: { credentials: 'include' },
        responseHeaders,
        statusCode: response.status,
        errorMessage: `Failed to fetch scenarios: ${response.statusText}`
      });
      throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
    }

    console.log('[getUserScenarios] Parsing JSON response...');
    const data = await response.json();
    console.log('[getUserScenarios] Data parsed successfully:', { scenarioCount: data.scenarios?.length || 0 });

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email },
      requestHeaders: { credentials: 'include' },
      responseData: data,
      responseHeaders,
      statusCode: response.status
    });

    return data.scenarios || [];
  } catch (error) {
    console.error('[getUserScenarios] Error fetching user scenarios:', error);
    if (error instanceof Error) {
      console.error('[getUserScenarios] Error name:', error.name);
      console.error('[getUserScenarios] Error message:', error.message);
      console.error('[getUserScenarios] Error stack:', error.stack);
    }

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email },
      requestHeaders: { credentials: 'include' },
      statusCode: 0,
      errorMessage: error instanceof Error ? error.message : String(error)
    }).catch(logError => {
      console.error('[getUserScenarios] Failed to log error:', logError);
    });

    throw error;
  }
}

export async function getScenarioGameData(email: string, uniqid: string): Promise<GameData> {
  const url = `${API_BASE_URL}/playground.php?action=get_scenario_game_data&email=${encodeURIComponent(email)}&uniqid=${uniqid}`;

  console.log(`[getScenarioGameData] Starting API call for scenario: ${uniqid}`);
  console.log(`[getScenarioGameData] URL: ${url}`);

  try {
    console.log(`[getScenarioGameData] Making fetch request...`);
    const response = await fetch(url, { credentials: 'include' });
    console.log(`[getScenarioGameData] Response received:`, response.status, response.statusText);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      console.error(`[getScenarioGameData] Request failed:`, response.status, response.statusText);
      await logApiCall({
        endpoint: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        requestParams: { email, uniqid },
        requestHeaders: { credentials: 'include' },
        responseHeaders,
        statusCode: response.status,
        errorMessage: `Failed to fetch game data: ${response.statusText}`
      });
      throw new Error(`Failed to fetch game data: ${response.statusText}`);
    }

    console.log(`[getScenarioGameData] Parsing JSON response...`);
    const data = await response.json();
    console.log(`[getScenarioGameData] Data parsed successfully`);
    console.log(`[getScenarioGameData] Data keys:`, Object.keys(data));

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email, uniqid },
      requestHeaders: { credentials: 'include' },
      responseData: data,
      responseHeaders,
      statusCode: response.status
    });

    console.log(`[getScenarioGameData] API call logged successfully`);
    return data;
  } catch (error) {
    console.error('[getScenarioGameData] Error fetching game data:', error);
    if (error instanceof Error) {
      console.error('[getScenarioGameData] Error name:', error.name);
      console.error('[getScenarioGameData] Error message:', error.message);
      console.error('[getScenarioGameData] Error stack:', error.stack);
    }
    throw error;
  }
}

export async function downloadMediaFile(email: string, uniqid: string, filename: string): Promise<Blob> {
  const url = `${API_BASE_URL}/playground.php?action=get_media&email=${encodeURIComponent(email)}&uniqid=${uniqid}&filename=${encodeURIComponent(filename)}`;

  console.log(`[downloadMediaFile] Downloading: ${filename}`);
  console.log(`[downloadMediaFile] URL: ${url}`);

  try {
    console.log(`[downloadMediaFile] Making fetch request...`);
    const response = await fetch(url, { credentials: 'include' });
    console.log(`[downloadMediaFile] Response received:`, response.status, response.statusText);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      console.error(`[downloadMediaFile] Request failed:`, response.status, response.statusText);
      await logApiCall({
        endpoint: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        requestParams: { email, uniqid, filename },
        requestHeaders: { credentials: 'include' },
        responseHeaders,
        statusCode: response.status,
        errorMessage: `Failed to download media: ${response.statusText}`
      });
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email, uniqid, filename },
      requestHeaders: { credentials: 'include' },
      responseData: `Binary file: ${filename}`,
      responseHeaders,
      statusCode: response.status
    });

    console.log(`[downloadMediaFile] Converting response to blob...`);
    const blob = await response.blob();
    console.log(`[downloadMediaFile] Blob created, size: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    console.error(`[downloadMediaFile] Error downloading media file ${filename}:`, error);
    if (error instanceof Error) {
      console.error('[downloadMediaFile] Error name:', error.name);
      console.error('[downloadMediaFile] Error message:', error.message);
      console.error('[downloadMediaFile] Error stack:', error.stack);
    }
    throw error;
  }
}

function extractFilenamesFromObject(obj: any, folder: string, mediaFiles: MediaFile[], path: string = ''): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        console.log(`[extractMediaFiles] Found ${folder} file at ${path}[${index}]: ${item}`);
        mediaFiles.push({ filename: item, folder });
      } else if (typeof item === 'object') {
        extractFilenamesFromObject(item, folder, mediaFiles, `${path}[${index}]`);
      }
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        console.log(`[extractMediaFiles] Found ${folder} file at ${path}.${key}: ${value}`);
        mediaFiles.push({ filename: value, folder });
      } else if (typeof value === 'object' && value !== null) {
        extractFilenamesFromObject(value, folder, mediaFiles, `${path}.${key}`);
      }
    });
  }
}

export function extractMediaFiles(gameData: GameData): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  console.log('[extractMediaFiles] ==================== STARTING EXTRACTION ====================');
  console.log('[extractMediaFiles] Game data keys:', Object.keys(gameData));
  console.log('[extractMediaFiles] Full game data structure:', JSON.stringify(gameData, null, 2).substring(0, 1000));

  if (!gameData.medias) {
    console.log('[extractMediaFiles] ❌ No medias field found in game data');
    console.log('[extractMediaFiles] Available keys:', Object.keys(gameData));
    return mediaFiles;
  }

  console.log('[extractMediaFiles] ✅ Found medias object');
  console.log('[extractMediaFiles] Medias keys:', Object.keys(gameData.medias));
  console.log('[extractMediaFiles] Medias structure:', JSON.stringify(gameData.medias, null, 2).substring(0, 2000));

  const mediaTypes = ['images', 'sounds', 'videos'];

  mediaTypes.forEach(type => {
    const folder = type.replace('sounds', 'sounds').replace('images', 'images').replace('videos', 'videos');

    if (gameData.medias[type]) {
      console.log(`[extractMediaFiles] 📂 Processing ${type}...`);
      console.log(`[extractMediaFiles] ${type} type:`, typeof gameData.medias[type]);
      console.log(`[extractMediaFiles] ${type} is array:`, Array.isArray(gameData.medias[type]));

      if (typeof gameData.medias[type] === 'object') {
        const beforeCount = mediaFiles.length;
        extractFilenamesFromObject(gameData.medias[type], folder, mediaFiles, type);
        const addedCount = mediaFiles.length - beforeCount;
        console.log(`[extractMediaFiles] ✅ Added ${addedCount} files from ${type}`);
      }
    } else {
      console.log(`[extractMediaFiles] ⚠️ No ${type} found in medias`);
    }
  });

  if (gameData.medias.levels && typeof gameData.medias.levels === 'object') {
    console.log('[extractMediaFiles] 📂 Processing levels...');
    const levelsArray = Array.isArray(gameData.medias.levels)
      ? gameData.medias.levels
      : Object.values(gameData.medias.levels);

    levelsArray.forEach((level, index) => {
      if (level && typeof level === 'object') {
        console.log(`[extractMediaFiles] Processing level ${index}:`, Object.keys(level));

        mediaTypes.forEach(type => {
          if (level[type]) {
            const folder = type.replace('sounds', 'sounds').replace('images', 'images').replace('videos', 'videos');
            const beforeCount = mediaFiles.length;
            extractFilenamesFromObject(level[type], folder, mediaFiles, `levels[${index}].${type}`);
            const addedCount = mediaFiles.length - beforeCount;
            console.log(`[extractMediaFiles] ✅ Added ${addedCount} files from level ${index} ${type}`);
          }
        });
      }
    });
  }

  if (gameData.medias.enigmas) {
    console.log('[extractMediaFiles] 📂 Processing enigmas...');
    const enigmasArray = Array.isArray(gameData.medias.enigmas)
      ? gameData.medias.enigmas
      : Object.values(gameData.medias.enigmas);

    enigmasArray.forEach((enigma, index) => {
      if (enigma && typeof enigma === 'object') {
        console.log(`[extractMediaFiles] Processing enigma ${index}:`, Object.keys(enigma));

        mediaTypes.forEach(type => {
          if (enigma[type]) {
            const folder = type.replace('sounds', 'sounds').replace('images', 'images').replace('videos', 'videos');
            const beforeCount = mediaFiles.length;
            extractFilenamesFromObject(enigma[type], folder, mediaFiles, `enigmas[${index}].${type}`);
            const addedCount = mediaFiles.length - beforeCount;
            console.log(`[extractMediaFiles] ✅ Added ${addedCount} files from enigma ${index} ${type}`);
          }
        });
      }
    });
  }

  const uniqueFiles = Array.from(
    new Map(mediaFiles.map(file => [`${file.folder}/${file.filename}`, file])).values()
  );

  console.log('[extractMediaFiles] ==================== EXTRACTION COMPLETE ====================');
  console.log(`[extractMediaFiles] 📊 Total files found: ${mediaFiles.length}`);
  console.log(`[extractMediaFiles] 📊 Unique files: ${uniqueFiles.length}`);
  console.log(`[extractMediaFiles] 📊 Files by folder:`, {
    images: uniqueFiles.filter(f => f.folder === 'images').length,
    sounds: uniqueFiles.filter(f => f.folder === 'sounds').length,
    videos: uniqueFiles.filter(f => f.folder === 'videos').length,
  });
  console.log('[extractMediaFiles] 📋 File list:', uniqueFiles.map(f => `${f.folder}/${f.filename}`));

  return uniqueFiles;
}

export interface AvailableScenario {
  scenario: {
    id: number;
    name: string;
    uniqid: string;
    scenario_type: string;
    available_for_purchase: boolean;
  };
  medias: {
    images: {
      game_visual: string;
    };
  };
}

export async function getAvailableScenarios(email: string): Promise<AvailableScenario[]> {
  const url = `${API_BASE_URL}/playground.php?action=get_available_scenarios&email=${encodeURIComponent(email)}`;

  console.log('[getAvailableScenarios] Starting API call to:', url);

  try {
    console.log('[getAvailableScenarios] Making fetch request...');
    const response = await fetch(url, { credentials: 'include' });
    console.log('[getAvailableScenarios] Response received:', response.status, response.statusText);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      console.error('[getAvailableScenarios] Request failed:', response.status, response.statusText);
      await logApiCall({
        endpoint: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        requestParams: { email },
        requestHeaders: { credentials: 'include' },
        responseHeaders,
        statusCode: response.status,
        errorMessage: `Failed to fetch available scenarios: ${response.statusText}`
      });
      throw new Error(`Failed to fetch available scenarios: ${response.statusText}`);
    }

    console.log('[getAvailableScenarios] Parsing JSON response...');
    const data = await response.json();
    console.log('[getAvailableScenarios] Data parsed successfully:', { scenarioCount: Array.isArray(data) ? data.length : 0 });

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email },
      requestHeaders: { credentials: 'include' },
      responseData: data,
      responseHeaders,
      statusCode: response.status
    });

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[getAvailableScenarios] Error fetching available scenarios:', error);
    if (error instanceof Error) {
      console.error('[getAvailableScenarios] Error name:', error.name);
      console.error('[getAvailableScenarios] Error message:', error.message);
      console.error('[getAvailableScenarios] Error stack:', error.stack);
    }

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email },
      requestHeaders: { credentials: 'include' },
      statusCode: 0,
      errorMessage: error instanceof Error ? error.message : String(error)
    }).catch(logError => {
      console.error('[getAvailableScenarios] Failed to log error:', logError);
    });

    return [];
  }
}

export async function downloadAvailableScenario(email: string, scenario: AvailableScenario): Promise<void> {
  console.log(`[downloadAvailableScenario] Starting download for scenario: ${scenario.scenario.uniqid}`);

  try {
    const gameData = {
      scenario: scenario.scenario,
      medias: scenario.medias
    };

    await (window as any).electron.scenarios.saveGameData(scenario.scenario.uniqid, gameData);
    console.log(`[downloadAvailableScenario] Game data saved successfully`);

    if (scenario.medias?.images?.game_visual) {
      console.log(`[downloadAvailableScenario] Downloading game visual: ${scenario.medias.images.game_visual}`);

      const blob = await downloadMediaFile(email, scenario.scenario.uniqid, scenario.medias.images.game_visual);
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = '';
      const chunkSize = 8192;
      for (let j = 0; j < bytes.length; j += chunkSize) {
        const chunk = bytes.slice(j, j + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);

      await (window as any).electron.scenarios.saveMedia(
        scenario.scenario.uniqid,
        'images',
        scenario.medias.images.game_visual,
        base64
      );
      console.log(`[downloadAvailableScenario] Game visual saved successfully`);
    }

    console.log(`[downloadAvailableScenario] Available scenario download completed: ${scenario.scenario.uniqid}`);
  } catch (error) {
    console.error(`[downloadAvailableScenario] Error downloading available scenario ${scenario.scenario.uniqid}:`, error);
    throw error;
  }
}
