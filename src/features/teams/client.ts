import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class TeamsClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async getTeam(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/teams/${encodeURIComponent(id)}` });
  }

  async updateTeam(id: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/teams/${encodeURIComponent(id)}`, body });
  }

  async listInvitations(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/teams/invitations${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async listMembers(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/teams/members${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }
}
