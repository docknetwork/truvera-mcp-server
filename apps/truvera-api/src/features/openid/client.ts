import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { PaginationParams } from "../shared/pagination.js";
import { CreateIssuerRequest, CreateCredentialOfferRequest } from "./types.js";

export class OpenIdClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createCredentialOffer(body: CreateCredentialOfferRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/openid/credential-offers", body });
  }

  async getCredentialOffer(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/openid/credential-offers/${encodeURIComponent(id)}` });
  }

  async listIssuers(options?: PaginationParams): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    const endpoint = `/openid/issuers${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async createIssuer(body: CreateIssuerRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/openid/issuers", body });
  }
}
