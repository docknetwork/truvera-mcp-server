import type { PresentationsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  {
    name: "list_proof_templates",
    description:
      "List proof templates. GET /proof-templates. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml",
    inputSchema: components.schemas.ListProofTemplatesOptions,
  },
  {
    name: "create_proof_template",
    description: `Create proof template. POST /proof-templates.

This creates a reusable proof template that defines the default "request" object (attributes, constraints, verification policy, nonce, etc.) used when generating proof requests from that template.

When creating a proof request you should treat the template as the canonical source of defaults — the proof request will merge the template's request with any overrides supplied in the CreateProofRequest body (e.g., attributes, nonce, or verification policy). If you are unsure of the template's defaults, fetch it first with GET /proof-templates/{id} and inspect its request structure.

⚠️ IMPORTANT: Truvera's proof request structure may differ from standard Indy/W3C conventions (attribute naming, request format). ALWAYS check the Truvera API spec for exact field names and formats: https://swagger-api.truvera.io/openapi.yaml`,
    inputSchema: components.schemas.CreateProofTemplateRequest,
  },
  {
    name: "get_proof_template",
    description:
      "Get proof template by ID. GET /proof-templates/{id}. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml",
    inputSchema: components.schemas.GetProofTemplateRequest,
  },
  {
    name: "create_proof_request",
    description: `Create proof request from template. POST /proof-templates/{templateId}/request.

This generates a concrete proof request using the template identified by templateId (path parameter) or, if templateId is not supplied, by the template property inside the request body (i.e., the body may contain template).

Behavior rules:
- If templateId is provided as a path parameter, it is authoritative; if the body also contains template it must match or the request will be rejected.
- If templateId is not provided, the handler will use body.template as the template identifier and remove it from the body before sending the request to the API.

The body must conform to the CreateProofRequest schema. The template's request provides default values; values provided in the body will override the template defaults. If you only have a template ID, call GET /proof-templates/{id} to inspect the template before composing the request. ⚠️ IMPORTANT: Truvera's proof request structure may differ from standard Indy/W3C conventions. ALWAYS check the Truvera API spec for exact field names and formats: https://swagger-api.truvera.io/openapi.yaml`,
    inputSchema: components.schemas.CreateProofRequestArgs,
  },
];

export function getHandlers(presentations: PresentationsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("list_proof_templates", async (args) => formatResult(await presentations.listProofTemplates(args || {})));
  handlers.set("create_proof_template", async (args) => formatResult(await presentations.createProofTemplate(args as import("./types.js").CreateProofTemplateRequest)));
  handlers.set("get_proof_template", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await presentations.getProofTemplate(id));
  });
  handlers.set("create_proof_request", async (args) => {
    let { templateId, body } = args as { templateId?: string; body?: Record<string, unknown> };
    if (!body) return { content: [{ type: "text", text: "Error: 'body' is required" }], isError: true };

    // If templateId is missing but body contains `template`, use it as the templateId.
    if (!templateId && Object.prototype.hasOwnProperty.call(body, "template")) {
      templateId = body.template as string;
      // remove the template property from the body before forwarding
      body = { ...body };
      delete body.template;
    }

    // If both are present, they must match or it's an error.
    if (templateId && Object.prototype.hasOwnProperty.call(body, "template")) {
      if (templateId !== body.template) {
        return { content: [{ type: "text", text: "Error: 'templateId' (path) does not match 'body.template'" }], isError: true };
      }
      // if they match, remove duplicate from body
      body = { ...body };
      delete body.template;
    }

    if (!templateId) return { content: [{ type: "text", text: "Error: 'templateId' is required (either path param or body.template)" }], isError: true };

    return formatResult(await presentations.createProofRequest(templateId, body));
  });

  return handlers;
}
