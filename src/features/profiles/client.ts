import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { CreateProfileRequest, UpdateProfileRequest } from "./types.js";
import { PaginationParams } from "../shared/pagination.js";

export class ProfilesClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createProfile(body: CreateProfileRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/profiles", body });
  }

  async listProfiles(options?: PaginationParams): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/profiles${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async getProfile(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/profiles/${encodeURIComponent(id)}` });
  }

  async updateProfile(did: string, body: UpdateProfileRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/profiles/${encodeURIComponent(did)}`, body });
  }

  async deleteProfile(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/profiles/${encodeURIComponent(id)}` });
  }
}
