/**
 * Backend API Client for Database Provisioning
 * 
 * This client communicates with the local Postgres backend API
 * to automatically provision databases for new apps.
 */

interface BackendConfig {
  baseUrl: string;
  authToken: string | null;
}

class BackendAPI {
  private config: BackendConfig = {
    // Default to production backend if env var not set
    baseUrl: process.env.BACKEND_API_URL || 'https://haix.ai/api',
    authToken: null,
  };
  
  constructor() {
    // Log the configured URL on initialization
    if (!process.env.BACKEND_API_URL) {
    }
  }

  setAuthToken(token: string) {
    this.config.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    console.log(`[BackendAPI] Requesting: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`[BackendAPI] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        console.error(`[BackendAPI] Error response:`, error);
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`[BackendAPI] Success:`, data);
      return data;
    } catch (error: any) {
      console.error(`[BackendAPI] Request failed:`, error.message);
      throw error;
    }
  }

  /**
   * Create a new app with automatic database provisioning
   * By default, creates a dedicated database (dedicatedDatabase: true)
   */
  async createApp(name: string, appType: 'web' | 'mobile' | 'godot' = 'web', dedicatedDatabase: boolean = true) {
    console.log(`[BackendAPI] Creating app: ${name}, type: ${appType}, dedicatedDatabase: ${dedicatedDatabase}`);
    console.log(`[BackendAPI] Using baseUrl: ${this.config.baseUrl}`);
    const result = await this.request('/apps', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        appType,
        dedicatedDatabase, // Explicitly set to true for dedicated databases
        userId: 1, // Default user ID
      }),
    });
    console.log(`[BackendAPI] App creation result:`, JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Get database information for an app
   */
  async getAppDatabase(appId: number) {
    return this.request(`/apps/${appId}/database`);
  }

  /**
   * Create app-specific schema tables (structured format)
   */
  async createAppSchema(appId: number, tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string; constraints?: string }>;
  }>) {
    return this.request(`/apps/${appId}/schema`, {
      method: 'POST',
      body: JSON.stringify({ tables }),
    });
  }

  /**
   * Create app-specific schema from raw SQL (AI-generated)
   */
  async createAppSchemaFromSQL(appId: number, sql: string) {
    return this.request(`/apps/${appId}/schema/sql`, {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
  }

  /**
   * Get database credentials for an app (for external access)
   */
  async getAppCredentials(appId: number) {
    return this.request(`/apps/${appId}/credentials`);
  }

  /**
   * Export database as SQL dump
   * Returns a Blob that can be downloaded
   */
  async exportAppDatabase(appId: number): Promise<Blob> {
    const url = `${this.config.baseUrl}/apps/${appId}/export`;
    const headers: HeadersInit = {};

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    console.log(`[BackendAPI] Exporting database for app ${appId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    console.log(`[BackendAPI] Export successful, size: ${blob.size} bytes`);
    return blob;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.config.baseUrl.replace('/api', '')}/health`);
      return response.json();
    } catch (error) {
      return { status: 'error', message: 'Backend not available' };
    }
  }
}

export const backendAPI = new BackendAPI();

