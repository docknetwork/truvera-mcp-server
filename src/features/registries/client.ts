import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class RegistriesClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listRegistries(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/registries${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createRegistry(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/registries", body });
  }

  async getRegistry(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/registries/${encodeURIComponent(id)}` });
  }

  async deleteRegistry(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/registries/${encodeURIComponent(id)}` });
  }
}
