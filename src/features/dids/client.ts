import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { PaginationParams } from "../shared/pagination.js";
import { CreateDidRequest } from "./types.js";

export class DidClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createDid(body: CreateDidRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: `/dids`, body });
  }

  async getDid(did: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/dids/${encodeURIComponent(did)}` });
  }

  async listDids(options?: PaginationParams): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/dids${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async deleteDid(did: string, fromBlockchain = true): Promise<ApiResponse> {
    const endpoint = `/dids/${encodeURIComponent(did)}${fromBlockchain ? "?fromBlockchain=true" : ""}`;
    return this.truvera.request({ method: "DELETE", endpoint });
  }

  async exportDid(did: string, password: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: `/dids/${encodeURIComponent(did)}/export`, body: { password } });
  }

  async importDids(data: string, password?: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: `/dids/import`, body: { data, password } });
  }
}
