import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class SchemasClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createSchema(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/schemas", body });
  }

  async listSchemas(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/schemas${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getSchema(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/schemas/${encodeURIComponent(id)}` });
  }

  async deleteSchema(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/schemas/${encodeURIComponent(id)}` });
  }
}
