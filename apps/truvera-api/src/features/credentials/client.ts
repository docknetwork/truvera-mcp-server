import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { IssueCredentialRequest, ListCredentialsQuery } from "./types.js";

export class CredentialsClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async listCredentials(options?: ListCredentialsQuery): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options?.offset !== undefined) params.append("offset", String(options.offset));
    if (options?.limit !== undefined) params.append("limit", String(options.limit));
    if (options?.filter) params.append("filter", options.filter);
    const endpoint = `/credentials${params.toString() ? `?${params.toString()}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async issueCredential(body: IssueCredentialRequest): Promise<ApiResponse> {
    console.log("Issuing credential with body:", body);
    return this.truvera.request({ method: "POST", endpoint: "/credentials", body });
  }

  async getCredential(id: string, password?: string): Promise<ApiResponse> {
    const endpoint = `/credentials/${encodeURIComponent(id)}${password ? `?password=${encodeURIComponent(password)}` : ""}`;
    return this.truvera.request({ method: "GET", endpoint });
  }

  async deleteCredential(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/credentials/${encodeURIComponent(id)}` });
  }
}
