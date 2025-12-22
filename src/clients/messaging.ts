import { TruveraClient, ApiResponse } from "./truvera.js";

export class MessagingClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async sendMessage(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/messaging/send", body });
  }

  async listMessages(options?: { offset?: number; limit?: number; to?: string; messageType?: string }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.to) params.append("to", options.to);
    if (options?.messageType) params.append("messageType", options.messageType);
    const endpoint = `/messaging/messages${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getMessage(messageId: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/messaging/messages/${encodeURIComponent(messageId)}` });
  }

  async deleteMessage(messageId: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/messaging/messages/${encodeURIComponent(messageId)}` });
  }
}