import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { DelegatableRevocationRequest } from "./types.js";

export class DelegationClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listDelegationRules(): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: "/delegationRules" });
  }

  async getDelegationRule(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/delegationRules/${encodeURIComponent(id)}` });
  }

  async revokeDelegatableCredential(body: DelegatableRevocationRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/delegatableRevocation", body });
  }
}
