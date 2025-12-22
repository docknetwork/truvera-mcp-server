import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class DataClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async getProfile(): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: "/data/profile" });
  }

  async updateProfile(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: "/data/profile", body });
  }

  async listNotifications(options?: { offset?: number; limit?: number; read?: boolean }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.read !== undefined) params.append("read", String(options.read));
    const endpoint = `/data/notifications${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }
}
