import { TruveraClient, ApiResponse } from "./truvera.js";

export class KeysClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listKeys(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/keys${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createKey(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/keys", body });
  }

  async deleteKey(publicKey: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/keys/${encodeURIComponent(publicKey)}` });
  }

  async updateKey(publicKey: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/keys/${encodeURIComponent(publicKey)}`, body });
  }
}