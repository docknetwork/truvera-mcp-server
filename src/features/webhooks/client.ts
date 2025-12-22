import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class WebhooksClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createWebhook(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/webhooks", body });
  }

  async listWebhooks(): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: "/webhooks" });
  }

  async getWebhook(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/webhooks/${encodeURIComponent(id)}` });
  }

  async updateWebhook(id: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/webhooks/${encodeURIComponent(id)}`, body });
  }

  async deleteWebhook(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/webhooks/${encodeURIComponent(id)}` });
  }
}
