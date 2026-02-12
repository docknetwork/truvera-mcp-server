import { describe, it, expect } from "vitest";
import { buildToolList } from "../../composeTools.js";

// Helper to recursively check if a schema contains any $ref entries (except within oneOf/anyOf/allOf arrays)
function hasUnresolvedRefs(obj: unknown, path = ""): { found: boolean; paths: string[] } {
  const paths: string[] = [];

  function traverse(val: unknown, p: string) {
    if (!val || typeof val !== "object") return;

    if (Array.isArray(val)) {
      val.forEach((item, idx) => traverse(item, `${p}[${idx}]`));
    } else {
      for (const [key, value] of Object.entries(val)) {
        const newPath = p ? `${p}.${key}` : key;

        // Skip $ref inside oneOf, anyOf, allOf as they may be intentional
        if ((key === "oneOf" || key === "anyOf" || key === "allOf") && Array.isArray(value)) {
          continue;
        }

        if (key === "$ref" && typeof value === "string") {
          paths.push(`${newPath}=${value}`);
        }

        traverse(value, newPath);
      }
    }
  }

  traverse(obj, path);
  return { found: paths.length > 0, paths };
}

describe("unit: tool list resolver", () => {
  it("resolves top-level $ref-only inputSchemas into component bodies", () => {
    const tools = buildToolList();

    // specific checks for presentations tools
    const createTemplate = tools.find((t) => t.name === "create_proof_template");
    expect(createTemplate).toBeDefined();
    const s1 = createTemplate!.inputSchema as Record<string, unknown>;
    expect(s1.$ref).toBeUndefined();
    expect(s1.type).toBe("object");

    const createRequest = tools.find((t) => t.name === "create_proof_request");
    expect(createRequest).toBeDefined();
    const s2 = createRequest!.inputSchema as Record<string, unknown>;
    expect(s2.$ref).toBeUndefined();
    expect(s2.properties).toBeDefined();

    // generic assertion: no tool should expose a top-level $ref-only inputSchema
    for (const t of tools) {
      const s = t.inputSchema;
      if (s && typeof s === 'object') {
        expect((s as Record<string, unknown>).$ref).toBeUndefined();
      }
    }
  });

  it("recursively resolves nested $refs within inputSchemas", () => {
    const tools = buildToolList();

    // The create_issuer tool has nested refs:
    // CreateIssuerRequest.credentialOptions -> CredentialIssueRequest.credential -> Credential
    const createIssuer = tools.find((t) => t.name === "create_issuer");
    expect(createIssuer).toBeDefined();

    const schema = createIssuer!.inputSchema as Record<string, unknown>;

    // Should have resolved credentialOptions from a $ref to an actual object
    expect(schema.properties).toBeDefined();
    expect((schema.properties as Record<string, unknown>).credentialOptions).toBeDefined();
    expect(((schema.properties as Record<string, unknown>).credentialOptions as Record<string, unknown>).$ref).toBeUndefined();

    // credentialOptions should have credential property (from CredentialIssueRequest)
    const credentialOptions = (schema.properties as Record<string, unknown>).credentialOptions as Record<string, unknown>;
    expect(credentialOptions.properties).toBeDefined();
    expect((credentialOptions.properties as Record<string, unknown>).credential).toBeDefined();

    // credential property should also be resolved (from Credential schema)
    const credentialProp = (credentialOptions.properties as Record<string, unknown>).credential as Record<string, unknown>;
    expect(credentialProp.$ref).toBeUndefined();
    expect(credentialProp.type).toBe("object");
    expect(credentialProp.properties).toBeDefined();

    // The credential should have subject property (not credentialSubject)
    expect((credentialProp.properties as Record<string, unknown>).subject).toBeDefined();
    expect((credentialProp.properties as Record<string, unknown>).credentialSubject).toBeUndefined();
  });

  it("ensures no tool has bare $ref-only top-level inputSchema", () => {
    const tools = buildToolList();

    for (const tool of tools) {
      const schema = tool.inputSchema;
      if (schema && typeof schema === "object") {
        // Top-level should never be a bare $ref
        expect((schema as Record<string, unknown>).$ref).toBeUndefined();
      }
    }
  });

  it("resolves all nested $refs in tool inputSchemas", () => {
    const tools = buildToolList();

    for (const tool of tools) {
      const schema = tool.inputSchema;
      if (!schema) continue;

      if (schema && typeof schema === "object") {
        const { found, paths } = hasUnresolvedRefs(schema, tool.name);

        // We expect no unresolved $refs in the main schema structure
        // (oneOf/anyOf are allowed to have $refs since they represent alternatives)
        if (found) {
          console.error(`Tool "${tool.name}" has unresolved $refs:`, paths);
        }
        expect(found, `Tool "${tool.name}" should not have unresolved $refs: ${paths.join(", ")}`).toBe(false);
      }
    }
  });
});
