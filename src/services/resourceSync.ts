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
  game_type?: string;
}

export interface Layout {
  id?: number;
  game_type: string;
  version: number | string;
  download_url?: string;
}

export interface PatternsResponse {
  patterns: Pattern[];
}

export interface LayoutsResponse {
  layouts: Layout[];
}

export interface ScenarioInfo {
  name: string;
  slug: string;
  uniqid: string;
  version: string;
}

export interface PatternInfo {
  name: string;
  game_type: string;
  version: string;
}

export interface UserDataUpdate {
  custom_scenarios: ScenarioInfo[];
  product_scenarios: ScenarioInfo[];
  default_patterns: PatternInfo[];
  custom_patterns: PatternInfo[];
  cards_version: number;
  has_on_demand_cards: boolean;
  layouts: Layout[];
  billing_up_to_date: boolean;
  license_type: string;
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

export async function getPatterns(apiUrl: string, email: string): Promise<PatternsResponse> {
  const url = `${apiUrl}?action=get_patterns&email=${encodeURIComponent(email)}`;
  const startTime = Date.now();

  console.log(`[ResourceSync] Fetching patterns`);
  console.log(`[ResourceSync] URL: ${url}`);

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[ResourceSync] Failed to fetch patterns: ${response.status} ${response.statusText}`);
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_patterns', email },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch patterns: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ResourceSync] Patterns response:`, data);
    console.log(`[ResourceSync] Found ${data.patterns?.length || 0} patterns`);

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_patterns', email },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ResourceSync] Error fetching patterns:`, error);
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_patterns', email },
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getLayouts(apiUrl: string, email: string): Promise<LayoutsResponse> {
  const url = `${apiUrl}?action=get_layouts&email=${encodeURIComponent(email)}`;
  const startTime = Date.now();

  console.log(`[ResourceSync] Fetching layouts`);
  console.log(`[ResourceSync] URL: ${url}`);

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[ResourceSync] Failed to fetch layouts: ${response.status} ${response.statusText}`);
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_layouts', email },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      });
      throw new Error(`Failed to fetch layouts: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ResourceSync] Layouts response:`, data);
    console.log(`[ResourceSync] Found ${data.layouts?.length || 0} layouts`);

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_layouts', email },
      responseData: data,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[ResourceSync] Error fetching layouts:`, error);
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_layouts', email },
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

export async function getUserDataUpdate(apiUrl: string, email: string): Promise<UserDataUpdate> {
  const url = `${apiUrl}?action=get_user_data_update&email=${encodeURIComponent(email)}`;
  const startTime = Date.now();

  console.log('[ResourceSync] Fetching user data update');
  console.log('[ResourceSync] URL:', url);

  try {
    const response = await fetch(url);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[ResourceSync] Failed to fetch user data update: ${response.status} ${response.statusText}`);
      await logApiCall({
        endpoint: url,
        method: 'GET',
        statusCode: response.status,
        requestParams: { action: 'get_user_data_update', email },
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        duration,
      });
      throw new Error(`Failed to fetch user data update: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[ResourceSync] User data update response:', {
      billingUpToDate: data.billing_up_to_date,
      licenseType: data.license_type,
      customScenarios: data.custom_scenarios?.length || 0,
      productScenarios: data.product_scenarios?.length || 0,
      defaultPatterns: data.default_patterns?.length || 0,
      customPatterns: data.custom_patterns?.length || 0,
      cardsVersion: data.cards_version,
      layouts: data.layouts?.length || 0,
    });

    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: response.status,
      requestParams: { action: 'get_user_data_update', email },
      responseData: data,
      duration,
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[ResourceSync] Error fetching user data update:', error);
    await logApiCall({
      endpoint: url,
      method: 'GET',
      statusCode: 0,
      requestParams: { action: 'get_user_data_update', email },
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    throw error;
  }
}
