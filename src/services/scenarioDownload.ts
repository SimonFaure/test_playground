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
  try {
    const url = `${API_BASE_URL}/playground.php?action=get_user_scenarios&email=${encodeURIComponent(email)}`;
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
    }

    const data = await response.json();
    return data.scenarios || [];
  } catch (error) {
    console.error('Error fetching user scenarios:', error);
    throw error;
  }
}

export async function getScenarioGameData(email: string, uniqid: string): Promise<GameData> {
  try {
    const url = `${API_BASE_URL}/playground.php?action=get_scenario_game_data&email=${encodeURIComponent(email)}&uniqid=${uniqid}`;
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to fetch game data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching game data:', error);
    throw error;
  }
}

export async function downloadMediaFile(uniqid: string, filename: string): Promise<Blob> {
  try {
    const url = `${API_BASE_URL}/playground.php?action=get_media&uniqid=${uniqid}&filename=${encodeURIComponent(filename)}`;
    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

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
