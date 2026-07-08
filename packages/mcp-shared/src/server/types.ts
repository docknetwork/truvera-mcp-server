import type { ToolDef, ToolHandler } from "../tools/types.js";
import type { BuildInfo } from "../types/build-info.js";
import type { AuthConfig, AuthContext } from "../auth/index.js";

export type { AuthConfig, AuthContext };

/**
 * Configuration for MCP server.
 *
 * Provide either `toolHandlers` (static, shared across all sessions) or
 * `toolHandlerFactory` (called per-session, receives the resolved AuthContext).
 * `toolHandlerFactory` takes precedence when both are supplied.
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
  /** Static handlers shared across all sessions. */
  toolHandlers?: Map<string, ToolHandler>;
  /** Per-session handler factory. Takes precedence over toolHandlers when provided. */
  toolHandlerFactory?: (context: AuthContext) => Map<string, ToolHandler> | Promise<Map<string, ToolHandler>>;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  /** Transport mode: stdio or http */
  mode: "stdio" | "http";
  /** HTTP port (only used when mode is "http") */
  port?: number;
  /** Auth configuration. Defaults to no-auth if omitted. */
  authConfig?: AuthConfig;
}
