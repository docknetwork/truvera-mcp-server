import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class OpenIdClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createCredentialOffer(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/openid/credential-offers", body });
  }

  async getCredentialOffer(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/openid/credential-offers/${encodeURIComponent(id)}` });
  }

  async listIssuers(options?: { offset?: number; limit?: number }): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/openid/issuers${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createIssuer(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/openid/issuers", body });
  }
}
