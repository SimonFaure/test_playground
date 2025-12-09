import { supabase } from '../lib/db';

const API_BASE_URL = 'https://admin.taghunter.fr/backend/api';

interface ApiLogEntry {
  endpoint: string;
  method: string;
  request_params: Record<string, unknown>;
  response_data: unknown;
  status_code: number;
  error_message?: string;
}

async function logApiCall(logEntry: ApiLogEntry) {
  if (!supabase) return;

  try {
    await supabase.from('api_logs').insert({
      endpoint: logEntry.endpoint,
      method: logEntry.method,
      request_params: logEntry.request_params,
      response_data: logEntry.response_data,
      status_code: logEntry.status_code,
      error_message: logEntry.error_message,
    });
  } catch (error) {
    console.error('Failed to log API call:', error);
  }
}

export async function getUserScenarios(email: string) {
  const endpoint = '/get_user_scenarios.php';
  const url = `${API_BASE_URL}${endpoint}?email=${encodeURIComponent(email)}`;

  console.log('📤 Fetching user scenarios:', {
    url,
    email,
    method: 'GET',
    credentials: 'include'
  });

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    const data = await response.json();

    console.log('📥 User scenarios response:', {
      status: response.status,
      statusText: response.statusText,
      data
    });

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: { email },
      response_data: data,
      status_code: response.status,
    });

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch user scenarios');
    }

    return { success: true, data: data.scenarios || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Error fetching user scenarios:', error);

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: { email },
      response_data: null,
      status_code: 500,
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

export async function getAllScenarios() {
  const endpoint = '/get_all_scenarios.php';
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    const data = await response.json();

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: {},
      response_data: data,
      status_code: response.status,
    });

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch all scenarios');
    }

    return { success: true, data: data.scenarios || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: {},
      response_data: null,
      status_code: 500,
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

export async function checkEmailExists(email: string) {
  const endpoint = '/check_email.php';
  const url = `${API_BASE_URL}${endpoint}?email=${encodeURIComponent(email)}`;

  try {
    const response = await fetch(url, {
      credentials: 'include',
    });

    const data = await response.json();

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: { email },
      response_data: data,
      status_code: response.status,
    });

    if (!response.ok) {
      throw new Error(data.message || 'Failed to check email');
    }

    return { success: true, exists: data.exists === true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logApiCall({
      endpoint,
      method: 'GET',
      request_params: { email },
      response_data: null,
      status_code: 500,
      error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

export const API_DOCUMENTATION = [
  {
    name: 'Check Email',
    endpoint: '/check_email.php',
    method: 'GET',
    description: 'Verify if an email address is registered in the system',
    parameters: [
      {
        name: 'email',
        type: 'string',
        required: true,
        description: 'The email address to check',
        example: 'user@example.com',
      },
    ],
    response: {
      success: {
        exists: true,
        message: 'Email found',
      },
      error: {
        exists: false,
        message: 'Email not found',
      },
    },
  },
  {
    name: 'Get User Scenarios',
    endpoint: '/get_user_scenarios.php',
    method: 'GET',
    description: 'Retrieve all scenarios assigned to a specific user',
    parameters: [
      {
        name: 'email',
        type: 'string',
        required: true,
        description: 'The user email address',
        example: 'user@example.com',
      },
    ],
    response: {
      success: {
        scenarios: [
          {
            id: 'string',
            name: 'string',
            description: 'string',
            type: 'string',
            created_at: 'timestamp',
          },
        ],
        message: 'Scenarios retrieved successfully',
      },
      error: {
        scenarios: [],
        message: 'Failed to retrieve scenarios',
      },
    },
  },
  {
    name: 'Get All Scenarios',
    endpoint: '/get_all_scenarios.php',
    method: 'GET',
    description: 'Retrieve all available scenarios in the system',
    parameters: [],
    response: {
      success: {
        scenarios: [
          {
            id: 'string',
            name: 'string',
            description: 'string',
            type: 'string',
            created_at: 'timestamp',
          },
        ],
        message: 'All scenarios retrieved successfully',
      },
      error: {
        scenarios: [],
        message: 'Failed to retrieve scenarios',
      },
    },
  },
];
