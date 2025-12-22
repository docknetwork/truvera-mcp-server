import { TruveraClient, ApiResponse } from "./truvera.js";

export class DidClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  /**
   * Create a Decentralized Identifier (DID)
   */
  async createDid(options: {
    method?: "cheqd" | "dock" | "key";
    did?: string;
    controller?: string;
    keyType?: "ed25519" | "bjj" | "secp256k1" | "sr25519";
    didcommServiceUrl?: string;
    includeDidcommService?: boolean;
    // allow arbitrary extras like document/metadata
    [k: string]: unknown;
  }): Promise<ApiResponse> {
    console.log("DidClient: creating DID with options:", options);
    return this.truvera.request({
      method: "POST",
      endpoint: "/dids",
      body: options,
    });
  }

  /**
   * Get a DID by its identifier
   */
  async getDid(did: string): Promise<ApiResponse> {
    const encodedDid = encodeURIComponent(did);
    return this.truvera.request({
      method: "GET",
      endpoint: `/dids/${encodedDid}`,
    });
  }

  /**
   * List all DIDs controlled by the user
   */
  async listDids(options?: {
    offset?: number;
    limit?: number;
    type?: string;
  }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.type) params.append("type", options.type);

    const endpoint = `/dids${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({
      method: "GET",
      endpoint,
    });
  }

  /**
   * Delete a DID
   */
  async deleteDid(did: string, fromBlockchain: boolean = true): Promise<ApiResponse> {
    const encodedDid = encodeURIComponent(did);
    const endpoint = `/dids/${encodedDid}?fromBlockchain=${fromBlockchain}`;
    return this.truvera.request({
      method: "DELETE",
      endpoint,
    });
  }

  /**
   * Export a DID and its keys as an encrypted wallet
   */
  async exportDid(did: string, password: string): Promise<ApiResponse> {
    const encodedDid = encodeURIComponent(did);
    return this.truvera.request({
      method: "POST",
      endpoint: `/dids/${encodedDid}/export`,
      body: { password },
    });
  }

  /**
   * Import DIDs from JSON objects
   */
  async importDids(data: unknown, password?: string): Promise<ApiResponse> {
    return this.truvera.request<unknown>({
      method: "POST",
      endpoint: "/dids/import",
      body: {
        data,
        password,
      },
    });
  }
}
