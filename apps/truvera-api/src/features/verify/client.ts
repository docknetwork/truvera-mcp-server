import { TruveraClient, ApiResponse } from "../../clients/truvera.js";
import { VerifyRequest } from "./types.js";

export class VerifyClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async verify(body: VerifyRequest): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/verify", body });
  }
}
