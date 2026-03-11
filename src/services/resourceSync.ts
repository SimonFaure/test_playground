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

    if (!response.ok) {
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_billing_status', email },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch billing status: ${response.statusText}`);
    }

    const data = await response.json();

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_billing_status', email },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_billing_status', email },
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

    if (!response.ok) {
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_cards_version', email },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch cards version: ${response.statusText}`);
    }

    const data = await response.json();

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_cards_version', email },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_cards_version', email },
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getPatterns(apiUrl: string, email: string, gameType: string): Promise<PatternsResponse> {
  const url = `${apiUrl}?action=get_patterns&email=${encodeURIComponent(email)}&game_type=${encodeURIComponent(gameType)}`;
  const startTime = Date.now();

  console.log(`[ResourceSync] Fetching patterns for game type: ${gameType}`);
  console.log(`[ResourceSync] URL: ${url}`);

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[ResourceSync] Failed to fetch patterns for ${gameType}: ${response.status} ${response.statusText}`);
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_patterns', email, game_type: gameType },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch patterns for ${gameType}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ResourceSync] Patterns response for ${gameType}:`, data);
    console.log(`[ResourceSync] Found ${data.patterns?.length || 0} patterns for ${gameType}`);

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_patterns', email, game_type: gameType },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ResourceSync] Error fetching patterns for ${gameType}:`, error);
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_patterns', email, game_type: gameType },
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getLayouts(apiUrl: string, email: string, gameType: string): Promise<LayoutsResponse> {
  const url = `${apiUrl}?action=get_layouts&email=${encodeURIComponent(email)}&game_type=${encodeURIComponent(gameType)}`;
  const startTime = Date.now();

  console.log(`[ResourceSync] Fetching layouts for game type: ${gameType}`);
  console.log(`[ResourceSync] URL: ${url}`);

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[ResourceSync] Failed to fetch layouts for ${gameType}: ${response.status} ${response.statusText}`);
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_layouts', email, game_type: gameType },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch layouts for ${gameType}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ResourceSync] Layouts response for ${gameType}:`, data);
    console.log(`[ResourceSync] Found ${data.layouts?.length || 0} layouts for ${gameType}`);

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_layouts', email, game_type: gameType },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ResourceSync] Error fetching layouts for ${gameType}:`, error);
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_layouts', email, game_type: gameType },
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
