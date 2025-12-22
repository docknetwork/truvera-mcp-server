import { TruveraClient, ApiResponse } from "./truvera.js";

export class PresentationsClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listProofTemplates(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/proof-templates${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createProofTemplate(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/proof-templates", body });
  }

  async getProofTemplate(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/proof-templates/${encodeURIComponent(id)}` });
  }

  async createProofRequest(templateId: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: `/proof-templates/${encodeURIComponent(templateId)}/request`, body });
  }
}