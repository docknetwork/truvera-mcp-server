import type { ToolDef, ToolHandler } from "../tools/types.js";
import type { BuildInfo } from "../types/build-info.js";

/**
 * Configuration for MCP server
 */
export interface ServerConfig {
  /** Server name (e.g., "truvera-mcp-service") */
  name: string;
  /** Server version */
  version: string;
  /** Build information */
  buildInfo: BuildInfo;
  /** List of tool definitions */
  tools: ToolDef[];
  /** Map of tool name to handler function */
  toolHandlers: Map<string, ToolHandler>;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Transport mode: stdio or http */
  mode: "stdio" | "http";
  /** HTTP port (only used when mode is "http") */
  port?: number;
}
