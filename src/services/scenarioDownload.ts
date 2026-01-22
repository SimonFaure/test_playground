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
  uniqid: string;
  title: string;
  description: string;
  game_type: string;
  media: MediaFile[];
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

  try {
    const response = await fetch(url, { credentials: 'include' });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
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

    const data = await response.json();

    await logApiCall({
      endpoint: new URL(url).pathname + new URL(url).search,
      method: 'GET',
      requestParams: { email, uniqid },
      requestHeaders: { credentials: 'include' },
      responseData: data,
      responseHeaders,
      statusCode: response.status
    });

    return data;
  } catch (error) {
    console.error('Error fetching game data:', error);
    throw error;
  }
}

export async function downloadMediaFile(uniqid: string, filename: string): Promise<Blob> {
  const url = `${API_BASE_URL}/playground.php?action=get_media&uniqid=${uniqid}&filename=${encodeURIComponent(filename)}`;

  try {
    const response = await fetch(url, { credentials: 'include' });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (!response.ok) {
      await logApiCall({
        endpoint: new URL(url).pathname + new URL(url).search,
        method: 'GET',
        requestParams: { uniqid, filename },
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
      requestParams: { uniqid, filename },
      requestHeaders: { credentials: 'include' },
      responseData: `Binary file: ${filename}`,
      responseHeaders,
      statusCode: response.status
    });

    return await response.blob();
  } catch (error) {
    console.error('Error downloading media file:', error);
    throw error;
  }
}

export function extractMediaFiles(gameData: GameData): MediaFile[] {
  const mediaFiles: MediaFile[] = [];

  if (gameData.media && Array.isArray(gameData.media)) {
    mediaFiles.push(...gameData.media);
  }

  return mediaFiles;
}
