/**
 * Truvera API Client
 * Centralized module for making authenticated requests to the Truvera API
 */

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  body?: unknown;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TruevaClient {
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

    try {
      const url = `${this.apiEndpoint}${endpoint}`;
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      };

      if (body && (method === "POST" || method === "PUT")) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API Error: ${response.status} ${response.statusText} - ${errorText}`,
        } as ApiResponse<T>;
      }

      const data = await response.json() as T;
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      } as ApiResponse<T>;
    }
  }

  /**
   * Create a Decentralized Identifier (DID)
   */
  async createDid(options: {
    method?: "cheqd" | "dock" | "key";
    did?: string;
    controller?: string;
    keyType?: "ed25519" | "bjj" | "secp256k1" | "sr25519";
    didcommServiceUrl?: string;
    includeDidcommService?: boolean;
  }): Promise<ApiResponse> {
    return this.request({
      method: "POST",
      endpoint: "/dids",
      body: options,
    });
  }

  /**
   * Get a DID by its identifier
   */
  async getDid(did: string): Promise<ApiResponse> {
    // Encode the DID for safe URL usage
    const encodedDid = encodeURIComponent(did);
    return this.request({
      method: "GET",
      endpoint: `/dids/${encodedDid}`,
    });
  }

  /**
   * List all DIDs controlled by the user
   */
  async listDids(options?: {
    offset?: number;
    limit?: number;
    type?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.type) params.append("type", options.type);

    const endpoint = `/dids${params.toString() ? `?${params.toString()}` : ""}`;
    return this.request({
      method: "GET",
      endpoint,
    });
  }

  /**
   * Delete a DID
   */
  async deleteDid(did: string, fromBlockchain: boolean = true): Promise<ApiResponse> {
    const encodedDid = encodeURIComponent(did);
    const endpoint = `/dids/${encodedDid}?fromBlockchain=${fromBlockchain}`;
    return this.request({
      method: "DELETE",
      endpoint,
    });
  }

  /**
   * Export a DID and its keys as an encrypted wallet
   */
  async exportDid(did: string, password: string): Promise<ApiResponse> {
    const encodedDid = encodeURIComponent(did);
    return this.request({
      method: "POST",
      endpoint: `/dids/${encodedDid}/export`,
      body: { password },
    });
  }

  /**
   * Import DIDs from JSON objects
   */
  async importDids(data: unknown, password?: string): Promise<ApiResponse> {
    return this.request<unknown>({
      method: "POST",
      endpoint: "/dids/import",
      body: {
        data,
        password,
      },
    });
  }
}
