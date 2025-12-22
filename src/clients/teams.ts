import { TruveraClient, ApiResponse } from "./truvera.js";

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

  async listInvitations(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/teams/${encodeURIComponent(id)}/invitations` });
  }

  async listMembers(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/teams/${encodeURIComponent(id)}/members` });
  }
}