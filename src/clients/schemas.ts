import { TruveraClient, ApiResponse } from "./truvera.js";

export class SchemasClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createSchema(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/schemas", body });
  }

  async listSchemas(options?: { offset?: number; limit?: number; includeEcosystems?: boolean }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.includeEcosystems !== undefined) params.append("includeEcosystems", String(options.includeEcosystems));
    const endpoint = `/schemas${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getSchema(schemaId: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/schemas/${encodeURIComponent(schemaId)}` });
  }

  async deleteSchema(schemaId: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/schemas/${encodeURIComponent(schemaId)}` });
  }
}