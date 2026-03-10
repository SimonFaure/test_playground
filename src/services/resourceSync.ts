import { logApiCall } from './apiLogger';

export interface BillingStatus {
  billing_up_to_date: boolean;
  license_type: string;
}

export interface CardsVersion {
  version: number;
}

export interface Pattern {
  slug: string;
  version: number;
  type: 'default' | 'user';
  download_url: string;
  name: string;
}

export interface Layout {
  game_type: string;
  version: number;
  download_url: string;
}

export interface PatternsResponse {
  patterns: Pattern[];
}

export interface LayoutsResponse {
  layouts: Layout[];
}

export async function getBillingStatus(apiUrl: string, email: string): Promise<BillingStatus> {
  const url = `${apiUrl}?action=get_billing_status&email=${encodeURIComponent(email)}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch billing status: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getCardsVersion(apiUrl: string, email: string): Promise<CardsVersion> {
  const url = `${apiUrl}?action=get_cards_version&email=${encodeURIComponent(email)}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cards version: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getPatterns(apiUrl: string, email: string, gameType: string): Promise<PatternsResponse> {
  const url = `${apiUrl}?action=get_patterns&email=${encodeURIComponent(email)}&game_type=${encodeURIComponent(gameType)}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch patterns for ${gameType}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getLayouts(apiUrl: string, email: string, gameType: string): Promise<LayoutsResponse> {
  const url = `${apiUrl}?action=get_layouts&email=${encodeURIComponent(email)}&game_type=${encodeURIComponent(gameType)}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch layouts for ${gameType}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function downloadCardsFile(url: string): Promise<string> {
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to download cards file: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function downloadPattern(url: string): Promise<string> {
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to download pattern: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function downloadLayout(url: string): Promise<string> {
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
    });

    if (!response.ok) {
      throw new Error(`Failed to download layout: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
