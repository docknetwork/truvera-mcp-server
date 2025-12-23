import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class MessagingClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async sendMessage(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/messages", body });
  }

  async listMessages(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/messages${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await this.truvera.request({ method: "GET", endpoint });
    // Some environments return 404 when there are no messages - map that to an empty list
    if (!res.success && res.error && res.error.includes("404")) {
      return { success: true, data: [] };
    }
    return res;
  }

  async getMessage(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/messages/${encodeURIComponent(id)}` });
  }

  async deleteMessage(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/messages/${encodeURIComponent(id)}` });
  }
}
