/**
 * Truvera API Client
 * Centralized module for making authenticated requests to the Truvera API
 */

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TruveraClient {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string = "https://api.truvera.com") {
    if (!apiKey) {
      throw new Error("TRUVERA_API_KEY environment variable is required");
    }
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Make an authenticated request to the Truvera API
   */
  async request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { method, endpoint, body } = options;

    const url = `${this.apiEndpoint}${endpoint}`;
    console.error(`TruveraClient request -> ${method} ${url} body=${body ? JSON.stringify(body) : '<none>'}`);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      const text = await response.text();
      let data: T | undefined = undefined;
      try {
        data = text ? (JSON.parse(text) as T) : undefined;
      } catch (e) {
        console.error("TruveraClient: failed to parse JSON response", e);
      }

      console.error(`TruveraClient response -> status=${response.status} statusText=${response.statusText} body=${text}`);

      if (!response.ok) {
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText} - ${text}`,
        } as ApiResponse<T>;
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("TruveraClient request failed:", error);
      return {
        success: false,
        error: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      } as ApiResponse<T>;
    }
  }
}
