import { TruveraClient } from "../clients/truvera.js";
import { DidClient } from "../features/dids/client.js";
import { CredentialsClient } from "../features/credentials/client.js";
import { PresentationsClient } from "../features/presentations/client.js";
import { SchemasClient } from "../features/schemas/client.js";
import { ProfilesClient } from "../features/profiles/client.js";
import { OpenIdClient } from "../features/openid/client.js";
import { VerifyClient } from "../features/verify/client.js";

import type { ToolDef, ToolHandler } from "./types.js";

import { toolDefs as truveraDefs, getHandlers as getTruveraHandlers } from "./truveraTool.js";
import { toolDefs as didsDefs, getHandlers as getDidsHandlers } from "../features/dids/tools.js";
import { toolDefs as credentialsDefs, getHandlers as getCredentialsHandlers } from "../features/credentials/index.js";
import { toolDefs as presentationsDefs, getHandlers as getPresentationsHandlers } from "../features/presentations/index.js";
import { toolDefs as schemasDefs, getHandlers as getSchemasHandlers } from "../features/schemas/index.js";
import { components as sharedComponents } from "../features/shared/schemas.js";
import { components as credentialsComponents } from "../features/credentials/schemas.js";
import { components as didsComponents } from "../features/dids/schemas.js";
import { components as presentationsComponents } from "../features/presentations/schemas.js";
import { components as schemasComponents } from "../features/schemas/schemas.js";
import { components as profilesComponents } from "../features/profiles/schemas.js";
import { components as openidComponents } from "../features/openid/schemas.js";
import { components as verifyComponents } from "../features/verify/schemas.js";
import { toolDefs as profilesDefs, getHandlers as getProfilesHandlers } from "../features/profiles/index.js";
import { toolDefs as openidDefs, getHandlers as getOpenidHandlers } from "../features/openid/index.js";
import { toolDefs as verifyDefs, getHandlers as getVerifyHandlers } from "../features/verify/index.js";

export function buildToolList(): ToolDef[] {
  const tools = [
    ...truveraDefs,
    ...didsDefs,
    ...credentialsDefs,
    ...presentationsDefs,
    ...schemasDefs,
    ...profilesDefs,
    ...openidDefs,
    ...verifyDefs,
  ];
  // Merge all known component schemas so we can resolve $ref references
  const mergedSchemas: Record<string, any> = {
    ...(sharedComponents?.schemas || {}),
    ...(credentialsComponents?.schemas || {}),
    ...(didsComponents?.schemas || {}),
    ...(presentationsComponents?.schemas || {}),
    ...(schemasComponents?.schemas || {}),
    ...(profilesComponents?.schemas || {}),
    ...(openidComponents?.schemas || {}),
    ...(verifyComponents?.schemas || {}),
  };

  function resolveRefObject(obj: any, parentKey?: string): any {
    if (!obj || typeof obj !== "object") return obj;
    // If this is a $ref object and not inside oneOf/anyOf/allOf arrays, replace it
    if (obj.$ref && typeof obj.$ref === "string" && parentKey !== "oneOf" && parentKey !== "anyOf" && parentKey !== "allOf") {
      const ref = obj.$ref as string;
      const match = ref.match(/#\/components\/schemas\/(.+)$/);
      if (match) {
        const name = match[1];
        const resolved = mergedSchemas[name];
        if (resolved) {
          // Deep clone then resolve inside
          const clone = JSON.parse(JSON.stringify(resolved));
          return resolveRefObject(clone);
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => resolveRefObject(item));
    }

    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = resolveRefObject(v, k);
    }
    return out;
  }

  // Resolve top-level $ref-only inputSchemas for inspector and tests
  const resolvedTools = tools.map((t) => {
    const copy: any = { ...t };
    if (copy.inputSchema && typeof copy.inputSchema === "object") {
      // If top-level is a $ref only, replace it; otherwise recursively resolve nested refs
      copy.inputSchema = resolveRefObject(JSON.parse(JSON.stringify(copy.inputSchema)));
    }
    return copy;
  });

  return resolvedTools;
}

export function buildHandlerMap(clients: {
  truvera: TruveraClient;
  dids: DidClient;
  credentials: CredentialsClient;
  presentations: PresentationsClient;
  schemas: SchemasClient;
  profiles: ProfilesClient;
  openid: OpenIdClient;
  verify: VerifyClient;
}) {
  const handlers = new Map<string, ToolHandler>();

  // Merge all handler maps from per-client modules
  const sources: Map<string, ToolHandler>[] = [
    getTruveraHandlers(clients.truvera),
    getDidsHandlers(clients.dids),
    getCredentialsHandlers(clients.credentials),
    getPresentationsHandlers(clients.presentations),
    getSchemasHandlers(clients.schemas),
    getProfilesHandlers(clients.profiles),
    getOpenidHandlers(clients.openid),
    getVerifyHandlers(clients.verify),
  ];

  for (const src of sources) {
    for (const [name, handler] of src) {
      handlers.set(name, handler);
    }
  }

  return handlers;
}

export function buildHandlerMapFromTruvera(truvera: TruveraClient) {
  const clients = {
    truvera,
    dids: new DidClient(truvera),
    credentials: new CredentialsClient(truvera),
    presentations: new PresentationsClient(truvera),
    schemas: new SchemasClient(truvera),
    profiles: new ProfilesClient(truvera),
    openid: new OpenIdClient(truvera),
    verify: new VerifyClient(truvera),
  };

  return buildHandlerMap(clients);
}
