import { describe, it, expect } from "vitest";
import { buildToolList } from "../../composeTools.js";

// Helper to recursively check if a schema contains any $ref entries (except within oneOf/anyOf/allOf arrays)
function hasUnresolvedRefs(obj: any, path = ""): { found: boolean; paths: string[] } {
  const paths: string[] = [];

  function traverse(val: any, p: string) {
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
    expect((createTemplate!.inputSchema as any).$ref).toBeUndefined();
    expect((createTemplate!.inputSchema as any).type).toBe("object");

    const createRequest = tools.find((t) => t.name === "create_proof_request");
    expect(createRequest).toBeDefined();
    expect((createRequest!.inputSchema as any).$ref).toBeUndefined();
    expect((createRequest!.inputSchema as any).properties).toBeDefined();

    // generic assertion: no tool should expose a top-level $ref-only inputSchema
    for (const t of tools) {
      const s = t.inputSchema as any;
      if (s && typeof s === "object") {
        expect(s.$ref).toBeUndefined();
      }
    }
  });

  it("recursively resolves nested $refs within inputSchemas", () => {
    const tools = buildToolList();

    // The create_issuer tool has nested refs:
    // CreateIssuerRequest.credentialOptions -> CredentialIssueRequest.credential -> Credential
    const createIssuer = tools.find((t) => t.name === "create_issuer");
    expect(createIssuer).toBeDefined();

    const schema = createIssuer!.inputSchema as any;

    // Should have resolved credentialOptions from a $ref to an actual object
    expect(schema.properties).toBeDefined();
    expect(schema.properties.credentialOptions).toBeDefined();
    expect((schema.properties.credentialOptions as any).$ref).toBeUndefined();

    // credentialOptions should have credential property (from CredentialIssueRequest)
    const credentialOptions = schema.properties.credentialOptions as any;
    expect(credentialOptions.properties).toBeDefined();
    expect(credentialOptions.properties.credential).toBeDefined();

    // credential property should also be resolved (from Credential schema)
    const credentialProp = credentialOptions.properties.credential as any;
    expect(credentialProp.$ref).toBeUndefined();
    expect(credentialProp.type).toBe("object");
    expect(credentialProp.properties).toBeDefined();

    // The credential should have subject property (not credentialSubject)
    expect(credentialProp.properties.subject).toBeDefined();
    expect(credentialProp.properties.credentialSubject).toBeUndefined();
  });

  it("ensures no tool has bare $ref-only top-level inputSchema", () => {
    const tools = buildToolList();

    for (const tool of tools) {
      const schema = tool.inputSchema as any;
      if (schema && typeof schema === "object") {
        // Top-level should never be a bare $ref
        expect(schema.$ref).toBeUndefined();
      }
    }
  });

  it("resolves all nested $refs in tool inputSchemas", () => {
    const tools = buildToolList();

    for (const tool of tools) {
      const schema = tool.inputSchema as any;
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
