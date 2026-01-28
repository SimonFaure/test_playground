import { logApiCall } from './apiLogger';

const API_BASE_URL = 'https://admin.taghunter.fr/backend/api';

export interface ScenarioSummary {
  id: number;
  title: string;
  description: string;
  game_type: string;
  scenario_type: string;
  uniqid: string;
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

export function extractMediaFiles(gameData: GameData): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  console.log('[extractMediaFiles] Starting media file extraction');
  console.log('[extractMediaFiles] Game data keys:', Object.keys(gameData));

  if (!gameData.medias) {
    console.log('[extractMediaFiles] No medias field found in game data');
    return mediaFiles;
  }

  console.log('[extractMediaFiles] Found medias object with keys:', Object.keys(gameData.medias));

  if (gameData.medias.images && typeof gameData.medias.images === 'object') {
    Object.values(gameData.medias.images).forEach(filename => {
      if (filename && typeof filename === 'string') {
        mediaFiles.push({ filename, folder: 'images' });
      }
    });
  }

  if (gameData.medias.sounds && typeof gameData.medias.sounds === 'object') {
    Object.values(gameData.medias.sounds).forEach(filename => {
      if (filename && typeof filename === 'string') {
        mediaFiles.push({ filename, folder: 'sounds' });
      }
    });
  }

  if (gameData.medias.videos && typeof gameData.medias.videos === 'object') {
    Object.values(gameData.medias.videos).forEach(filename => {
      if (filename && typeof filename === 'string') {
        mediaFiles.push({ filename, folder: 'videos' });
      }
    });
  }

  if (gameData.medias.levels && typeof gameData.medias.levels === 'object') {
    Object.values(gameData.medias.levels).forEach(level => {
      if (level && typeof level === 'object') {
        if (level.images && typeof level.images === 'object') {
          Object.values(level.images).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'images' });
            }
          });
        }
        if (level.sounds && typeof level.sounds === 'object') {
          Object.values(level.sounds).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'sounds' });
            }
          });
        }
        if (level.videos && typeof level.videos === 'object') {
          Object.values(level.videos).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'videos' });
            }
          });
        }
      }
    });
  }

  if (gameData.medias.enigmas && Array.isArray(gameData.medias.enigmas)) {
    gameData.medias.enigmas.forEach(enigma => {
      if (enigma && typeof enigma === 'object') {
        if (enigma.images && typeof enigma.images === 'object') {
          Object.values(enigma.images).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'images' });
            }
          });
        }
        if (enigma.sounds && typeof enigma.sounds === 'object') {
          Object.values(enigma.sounds).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'sounds' });
            }
          });
        }
        if (enigma.videos && typeof enigma.videos === 'object') {
          Object.values(enigma.videos).forEach(filename => {
            if (filename && typeof filename === 'string') {
              mediaFiles.push({ filename, folder: 'videos' });
            }
          });
        }
      }
    });
  }

  const uniqueFiles = Array.from(
    new Map(mediaFiles.map(file => [`${file.folder}/${file.filename}`, file])).values()
  );

  console.log(`[extractMediaFiles] Extracted ${uniqueFiles.length} unique media files`);
  console.log(`[extractMediaFiles] Files by folder:`, {
    images: uniqueFiles.filter(f => f.folder === 'images').length,
    sounds: uniqueFiles.filter(f => f.folder === 'sounds').length,
    videos: uniqueFiles.filter(f => f.folder === 'videos').length,
  });

  return uniqueFiles;
}
