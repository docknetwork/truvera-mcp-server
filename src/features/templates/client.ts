import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class TemplatesClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createTemplate(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/templates", body });
  }

  async listTemplates(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/templates${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getTemplate(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/templates/${encodeURIComponent(id)}` });
  }

  async updateTemplate(id: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/templates/${encodeURIComponent(id)}`, body });
  }

  async deleteTemplate(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/templates/${encodeURIComponent(id)}` });
  }
}
