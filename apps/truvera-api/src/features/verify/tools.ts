import type { VerifyClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";
import type { VerifyRequest } from "./types.js";

export const toolDefs: ToolDef[] = [
  { name: "verify", description: "Verify verifiable credentials, presentations, or JWTs. POST /verify. Accepts VerifiableCredential, VerifiablePresentation, or JWT string. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.VerifyRequest },
];

export function getHandlers(verify: VerifyClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("verify", async (args) => formatResult(await verify.verify(args as VerifyRequest)));

  return handlers;
}
