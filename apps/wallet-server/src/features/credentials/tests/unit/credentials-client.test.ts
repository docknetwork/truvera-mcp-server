import { describe, it, expect, vi } from "vitest";
import { CredentialClient } from "../../client.js";

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
