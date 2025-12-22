import { TruveraClient, ApiResponse } from "./truvera.js";

export class SubaccountsClient {
  private truvera: TruveraClient;

  constructor(truveraClient: TruveraClient) {
    this.truvera = truveraClient;
  }

  async createSubaccount(body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "POST", endpoint: "/subaccounts", body });
  }

  async listSubaccounts(): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: "/subaccounts" });
  }

  async getSubaccount(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "GET", endpoint: `/subaccounts/${encodeURIComponent(id)}` });
  }

  async updateSubaccount(id: string, body: unknown): Promise<ApiResponse> {
    return this.truvera.request({ method: "PATCH", endpoint: `/subaccounts/${encodeURIComponent(id)}`, body });
  }

  async deleteSubaccount(id: string): Promise<ApiResponse> {
    return this.truvera.request({ method: "DELETE", endpoint: `/subaccounts/${encodeURIComponent(id)}` });
  }
}