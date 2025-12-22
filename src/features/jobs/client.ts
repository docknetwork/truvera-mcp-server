import { TruveraClient, ApiResponse } from "../../clients/truvera.js";

export class JobsClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async getJob(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/jobs/${encodeURIComponent(id)}` });
  }
}
