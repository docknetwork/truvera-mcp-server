import type { VerifyClient } from "../clients/verify.js";
import type { ToolDef, ToolHandler } from "./types.js";
import { formatResult } from "./utils.js";

export const toolDefs: ToolDef[] = [
  { name: "verify", description: "Verify data", inputSchema: { type: "object" } },
];

export function getHandlers(verify: VerifyClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("verify", async (args) => formatResult(await verify.verify(args)));

  return handlers;
}
