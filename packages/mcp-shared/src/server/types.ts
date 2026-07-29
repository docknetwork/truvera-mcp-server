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
/**
 * Result of a per-session toolHandlerFactory call. Return a bare Map when the
 * session's handlers hold no resources that need releasing; return the object
 * form with `dispose` when they do (e.g. background timers, open file handles)
 * so the transport can release them as soon as the session ends, rather than
 * only at process shutdown.
 */
export type ToolHandlerFactoryResult =
  | Map<string, ToolHandler>
  | { handlers: Map<string, ToolHandler>; dispose?: () => void | Promise<void> };

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
  /**
   * Per-session handler factory. Takes precedence over toolHandlers when provided.
   * In HTTP mode this is called once per session and its `dispose` (if returned)
   * runs when that session's transport closes.
   */
  toolHandlerFactory?: (context: AuthContext) => ToolHandlerFactoryResult | Promise<ToolHandlerFactoryResult>;
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
  /**
   * Enables POST /admin/revoke-tenant on the HTTP transport, gated by a
   * shared secret sent as the X-Admin-Secret header. Only meaningful when
   * mode is "http"; ignored in stdio mode.
   */
  adminRevoke?: {
    secret: string;
    onRevoke: (tenantId: string) => void | Promise<void>;
  };
}
