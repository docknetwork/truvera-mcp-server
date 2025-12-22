import type { ApiResponse } from "../clients/truvera.js";
import type { ToolResult } from "./types.js";

export function formatResult(result: ApiResponse): ToolResult {
  if (!result.success) {
    return {
      content: [{ type: "text", text: result.error || "Unknown error" }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
  };
}
