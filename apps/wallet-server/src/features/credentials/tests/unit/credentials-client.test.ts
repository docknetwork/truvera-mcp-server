import { describe, it, expect, vi, beforeEach } from "vitest";
import { CredentialClient } from "../../client.js";
import { createVerificationController } from "@docknetwork/wallet-sdk-core/lib/verification-controller.js";

vi.mock("@docknetwork/wallet-sdk-core/lib/verification-controller.js", () => ({
  createVerificationController: vi.fn(),
}));
vi.mock("@docknetwork/wallet-sdk-core/lib/credential-provider.js", () => ({
  createCredentialProvider: vi.fn().mockReturnValue({}),
}));
vi.mock("@docknetwork/wallet-sdk-core/lib/did-provider.js", () => ({
  createDIDProvider: vi.fn().mockReturnValue({}),
}));

function makeClient(): CredentialClient {
  const mockWallet = {} as any;
  return new CredentialClient(mockWallet);
}

describe("unit: CredentialClient attribute helpers", () => {
  describe("getCredentialAttributeKeys", () => {
    it("returns full credentialSubject paths for top-level attributes", () => {
      const client = makeClient();
      const credential = {
        credentialSubject: { id: "did:key:z6Mk", name: "Alice", age: 30, department: "Engineering" },
      };

      const keys = (client as any).getCredentialAttributeKeys(credential);

      expect(keys).toEqual(["credentialSubject.name", "credentialSubject.age", "credentialSubject.department"]);
    });

    it("excludes the id field from credentialSubject", () => {
      const client = makeClient();
      const credential = { credentialSubject: { id: "did:key:z6Mk", jobTitle: "Engineer" } };

      const keys = (client as any).getCredentialAttributeKeys(credential);

      expect(keys).toEqual(["credentialSubject.jobTitle"]);
      expect(keys).not.toContain("credentialSubject.id");
    });

    it("reads credentialSubject from nested credential property", () => {
      const client = makeClient();
      const doc = {
        credential: { credentialSubject: { startDate: "2023-01-15", employerName: "Acme" } },
      };

      const keys = (client as any).getCredentialAttributeKeys(doc);

      expect(keys).toEqual(["credentialSubject.startDate", "credentialSubject.employerName"]);
    });

    it("returns empty array when credentialSubject is missing", () => {
      const client = makeClient();
      expect((client as any).getCredentialAttributeKeys({})).toEqual([]);
      expect((client as any).getCredentialAttributeKeys(null)).toEqual([]);
      expect((client as any).getCredentialAttributeKeys({ credentialSubject: null })).toEqual([]);
    });
  });

  describe("normalizeAttributesToReveal", () => {
    const credential = {
      credentialSubject: { name: "Alice", startDate: "2023-01-15", department: "Engineering" },
    };

    it("returns undefined when attributes is undefined", () => {
      const client = makeClient();
      expect((client as any).normalizeAttributesToReveal(undefined, credential)).toBeUndefined();
    });

    it("promotes bare names that match credentialSubject keys to full paths", () => {
      const client = makeClient();
      const result = (client as any).normalizeAttributesToReveal(["startDate"], credential);
      expect(result).toEqual(["credentialSubject.startDate"]);
    });

    it("leaves already-prefixed credentialSubject paths unchanged", () => {
      const client = makeClient();
      const result = (client as any).normalizeAttributesToReveal(["credentialSubject.startDate"], credential);
      expect(result).toEqual(["credentialSubject.startDate"]);
    });

    it("leaves non-credentialSubject fields unchanged", () => {
      const client = makeClient();
      // "issuer" is not in credentialSubject, so it must not be promoted
      const result = (client as any).normalizeAttributesToReveal(["issuer"], credential);
      expect(result).toEqual(["issuer"]);
    });

    it("handles mixed array: flat subject name, already-prefixed path, and non-subject field", () => {
      const client = makeClient();
      const result = (client as any).normalizeAttributesToReveal(
        ["startDate", "credentialSubject.department", "issuer"],
        credential
      );
      expect(result).toEqual([
        "credentialSubject.startDate",
        "credentialSubject.department",
        "issuer",
      ]);
    });

    it("does not promote a bare name that looks like a subject key but contains a dot", () => {
      const client = makeClient();
      // "credentialSubject.name" already has a dot — must be left as-is regardless
      const result = (client as any).normalizeAttributesToReveal(["credentialSubject.name"], credential);
      expect(result).toEqual(["credentialSubject.name"]);
    });

    it("handles credential with nested credential property", () => {
      const client = makeClient();
      const doc = { credential: { credentialSubject: { jobTitle: "Engineer" } } };
      const result = (client as any).normalizeAttributesToReveal(["jobTitle"], doc);
      expect(result).toEqual(["credentialSubject.jobTitle"]);
    });

    it("does not promote a bare name that is not in credentialSubject", () => {
      const client = makeClient();
      // "unknownField" is not in credentialSubject
      const result = (client as any).normalizeAttributesToReveal(["unknownField"], credential);
      expect(result).toEqual(["unknownField"]);
    });
  });
});

describe("unit: CredentialClient.removeCredential", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes the credential when found", async () => {
    const mockDoc = { id: "urn:uuid:abc123", type: ["VerifiableCredential"] };
    const mockRemoveCredential = vi.fn().mockResolvedValue(undefined);
    const mockProvider = {
      getById: vi.fn().mockResolvedValue(mockDoc),
      removeCredential: mockRemoveCredential,
    };

    const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
    vi.mocked(createCredentialProvider).mockReturnValue(mockProvider as any);

    const client = new CredentialClient({} as any);
    const result = await client.removeCredential("urn:uuid:abc123");

    expect(mockProvider.getById).toHaveBeenCalledWith("urn:uuid:abc123");
    expect(mockRemoveCredential).toHaveBeenCalledWith(mockDoc);
    expect(result.success).toBe(true);
  });

  it("returns failure when credential is not found", async () => {
    const mockProvider = {
      getById: vi.fn().mockResolvedValue(null),
      removeCredential: vi.fn(),
    };

    const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
    vi.mocked(createCredentialProvider).mockReturnValue(mockProvider as any);

    const client = new CredentialClient({} as any);
    const result = await client.removeCredential("urn:uuid:missing");

    expect(mockProvider.removeCredential).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toContain("not found");
  });

  it("returns failure when removeCredential throws", async () => {
    const mockDoc = { id: "urn:uuid:abc123" };
    const mockProvider = {
      getById: vi.fn().mockResolvedValue(mockDoc),
      removeCredential: vi.fn().mockRejectedValue(new Error("Storage error")),
    };

    const { createCredentialProvider } = await import("@docknetwork/wallet-sdk-core/lib/credential-provider.js");
    vi.mocked(createCredentialProvider).mockReturnValue(mockProvider as any);

    const client = new CredentialClient({} as any);
    const result = await client.removeCredential("urn:uuid:abc123");

    expect(result.success).toBe(false);
    expect(result.message).toBe("Storage error");
  });
});

describe("unit: CredentialClient.respondToProofRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns failed when createPresentation returns null", async () => {
    const mockController = {
      start: vi.fn().mockResolvedValue(undefined),
      getFilteredCredentials: vi.fn().mockReturnValue([
        {
          id: "cred-1",
          type: ["VerifiableCredential"],
          issuer: "did:example:issuer",
          issuanceDate: "2024-01-01",
          credentialSubject: { name: "Alice" },
        },
      ]),
      isBBSPlusCredential: vi.fn().mockResolvedValue(false),
      selectedCredentials: new Map(),
      createPresentation: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(createVerificationController).mockReturnValue(mockController as any);

    const client = new CredentialClient({} as any);
    const result = await client.respondToProofRequest({ proofRequest: { id: "proof-1" } as any });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.message).toBe("createPresentation returned no presentation.");
  });
});
