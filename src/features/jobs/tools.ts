import type { JobsClient } from "./client.js";
import type { ToolDef, ToolHandler } from "../../tools/types.js";
import { formatResult } from "../../tools/utils.js";

export const toolDefs: ToolDef[] = [
  { name: "get_job", description: "Get job", inputSchema: { type: "object", required: ["id"] } },
];

export function getHandlers(jobs: JobsClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("get_job", async (args) => {
    const { id } = args as any;
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await jobs.getJob(id));
  });

  return handlers;
}
