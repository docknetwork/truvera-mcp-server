import { TruveraClient, ApiResponse } from "./truvera.js";

export class VerifyClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async verify(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/verify", body });
  }
}