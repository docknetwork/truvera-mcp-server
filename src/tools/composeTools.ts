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
import { components as presentationsComponents } from "../features/presentations/schemas.js";
import { toolDefs as schemasDefs, getHandlers as getSchemasHandlers } from "../features/schemas/index.js";
import { components as schemasComponents } from "../features/schemas/schemas.js";
import { toolDefs as profilesDefs, getHandlers as getProfilesHandlers } from "../features/profiles/index.js";
import { components as profilesComponents } from "../features/profiles/schemas.js";
import { toolDefs as openidDefs, getHandlers as getOpenidHandlers } from "../features/openid/index.js";
import { components as openidComponents } from "../features/openid/schemas.js";
import { toolDefs as verifyDefs, getHandlers as getVerifyHandlers } from "../features/verify/index.js";
import { components as verifyComponents } from "../features/verify/schemas.js";
import { components as credentialsComponents } from "../features/credentials/schemas.js";
import { components as didsComponents } from "../features/dids/schemas.js";
import { components as sharedComponents } from "../features/shared/schemas.js"; 

function mergeSchemas(): Record<string, any> {
  return {
    ...sharedComponents.schemas,
    ...schemasComponents.schemas,
    ...credentialsComponents.schemas,
    ...didsComponents.schemas,
    ...presentationsComponents.schemas,
    ...profilesComponents.schemas,
    ...openidComponents.schemas,
    ...verifyComponents.schemas,
  };
}

function resolveAllRefs(obj: any, schemas: Record<string, any>): any {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveAllRefs(item, schemas));
  }

  // If this object is a $ref, resolve it and recursively resolve the result
  if (obj.$ref && Object.keys(obj).length === 1 && typeof obj.$ref === 'string') {
    const ref = obj.$ref as string;
    const m = ref.match(/^#\/components\/schemas\/(.+)$/);
    if (m) {
      const name = m[1];
      if (schemas && schemas[name]) {
        return resolveAllRefs(JSON.parse(JSON.stringify(schemas[name])), schemas);
      }
    }
    return obj;
  }

  // Otherwise, recursively resolve $refs within this object's properties
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveAllRefs(value, schemas);
  }
  return result;
}

function resolveTopLevelRefs(tools: ToolDef[]) {
  const schemas: Record<string, any> = mergeSchemas();
  for (const t of tools) {
    const s = t.inputSchema as any;
    if (s && typeof s === 'object' && Object.keys(s).length === 1 && typeof s.$ref === 'string') {
      const ref = s.$ref as string;
      const m = ref.match(/^#\/components\/schemas\/(.+)$/);
      if (m) {
        const name = m[1];
        if (schemas && schemas[name]) {
          // shallow clone to avoid accidental mutation
          t.inputSchema = resolveAllRefs(JSON.parse(JSON.stringify(schemas[name])), schemas);
        }
      }
    } else if (s && typeof s === 'object') {
      // For non-bare-$ref schemas, still resolve nested $refs
      t.inputSchema = resolveAllRefs(s, schemas);
    }
  }
}

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

  // Resolve top-level $ref-only schemas into their referenced component bodies
  resolveTopLevelRefs(tools);

  return tools;
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
