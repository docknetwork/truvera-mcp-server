import { describe, it, expect, vi, afterEach } from "vitest";
import { TruveraClient } from "../../src/clients/index.js";

const OK_RESPONSE = new Response("{}", { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TruveraClient — per-session API key (passthrough auth)", () => {
  it("sends the caller-supplied API key as the Authorization bearer token", async () => {
    const mockFetch = vi.fn().mockResolvedValue(OK_RESPONSE);
    vi.stubGlobal("fetch", mockFetch);

    const client = new TruveraClient("alice-api-key", "https://api.truvera.com");
    await client.request({ method: "GET", endpoint: "/dids" });

    const [, opts] = mockFetch.mock.calls[0];
    expect((opts as RequestInit).headers).toMatchObject({
      Authorization: "Bearer alice-api-key",
    });
  });

  it("uses distinct keys for distinct per-session clients", async () => {
    const mockFetch = vi.fn().mockResolvedValue(OK_RESPONSE);
    vi.stubGlobal("fetch", mockFetch);

    await new TruveraClient("alice-key", "https://api.truvera.com").request({ method: "GET", endpoint: "/x" });
    await new TruveraClient("bob-key", "https://api.truvera.com").request({ method: "GET", endpoint: "/x" });

    const aliceHeader = ((mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>).Authorization;
    const bobHeader = ((mockFetch.mock.calls[1][1] as RequestInit).headers as Record<string, string>).Authorization;

    expect(aliceHeader).toBe("Bearer alice-key");
    expect(bobHeader).toBe("Bearer bob-key");
  });

  it("throws at construction time when the API key is empty", () => {
    expect(() => new TruveraClient("", "https://api.truvera.com")).toThrow();
  });

  it("prefixes the endpoint with the configured base URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue(OK_RESPONSE);
    vi.stubGlobal("fetch", mockFetch);

    await new TruveraClient("key", "https://custom.host").request({ method: "GET", endpoint: "/dids" });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://custom.host/dids");
  });
});
