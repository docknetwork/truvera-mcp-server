import type { VerifyClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";

export const toolDefs: ToolDef[] = [
  { name: "verify", description: "Verify data", inputSchema: components.schemas.VerifyRequest },
];

export function getHandlers(verify: VerifyClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("verify", async (args) => formatResult(await verify.verify(args)));

  return handlers;
}
