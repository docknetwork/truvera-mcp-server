import { TruveraClient, ApiResponse } from "./truvera.js";

export class ProfilesClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createProfile(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/profiles", body });
  }

  async listProfiles(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/profiles${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getProfile(did: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/profiles/${encodeURIComponent(did)}` });
  }

  async updateProfile(did: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/profiles/${encodeURIComponent(did)}`, body });
  }

  async deleteProfile(did: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/profiles/${encodeURIComponent(did)}` });
  }
}