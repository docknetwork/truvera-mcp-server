import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class TrustRegistriesClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listTrustRegistries(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/trust-registries${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createTrustRegistry(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/trust-registries", body });
  }

  async getTrustRegistry(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/trust-registries/${encodeURIComponent(id)}` });
  }

  async deleteTrustRegistry(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/trust-registries/${encodeURIComponent(id)}` });
  }
}
