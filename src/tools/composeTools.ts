import { TruveraClient } from "../clients/truvera.js";
import { DidClient } from "../features/dids/client.js";
import { CredentialsClient } from "../features/credentials/client.js";
import { PresentationsClient } from "../features/presentations/client.js";
import { RegistriesClient } from "../features/registries/client.js";
import { SchemasClient } from "../features/schemas/client.js";
import { ProfilesClient } from "../features/profiles/client.js";
import { MessagingClient } from "../features/messaging/client.js";
import { OpenIdClient } from "../features/openid/client.js";
import { VerifyClient } from "../features/verify/client.js";

import type { ToolDef, ToolHandler } from "./types.js";

import { toolDefs as truveraDefs, getHandlers as getTruveraHandlers } from "./truveraTool.js";
import { toolDefs as didsDefs, getHandlers as getDidsHandlers } from "../features/dids/tools.js";
import { toolDefs as credentialsDefs, getHandlers as getCredentialsHandlers } from "../features/credentials/index.js";
import { toolDefs as presentationsDefs, getHandlers as getPresentationsHandlers } from "../features/presentations/index.js";
import { toolDefs as registriesDefs, getHandlers as getRegistriesHandlers } from "../features/registries/index.js";
import { toolDefs as schemasDefs, getHandlers as getSchemasHandlers } from "../features/schemas/index.js";
import { toolDefs as profilesDefs, getHandlers as getProfilesHandlers } from "../features/profiles/index.js";
import { toolDefs as messagingDefs, getHandlers as getMessagingHandlers } from "../features/messaging/index.js";
import { toolDefs as openidDefs, getHandlers as getOpenidHandlers } from "../features/openid/index.js";
import { toolDefs as verifyDefs, getHandlers as getVerifyHandlers } from "../features/verify/index.js";

export function buildToolList(): ToolDef[] {
  return [
    ...truveraDefs,
    ...didsDefs,
    ...credentialsDefs,
    ...presentationsDefs,
    ...registriesDefs,
    ...schemasDefs,
    ...profilesDefs,
    ...messagingDefs,
    ...openidDefs,
    ...verifyDefs,
  ];
}

export function buildHandlerMap(clients: {
  truvera: TruveraClient;
  dids: DidClient;
  credentials: CredentialsClient;
  presentations: PresentationsClient;
  registries: RegistriesClient;
  schemas: SchemasClient;
  profiles: ProfilesClient;
  messaging: MessagingClient;
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
    getRegistriesHandlers(clients.registries),
    getSchemasHandlers(clients.schemas),
    getProfilesHandlers(clients.profiles),
    getMessagingHandlers(clients.messaging),
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
    registries: new RegistriesClient(truvera),
    schemas: new SchemasClient(truvera),
    profiles: new ProfilesClient(truvera),
    messaging: new MessagingClient(truvera),
    openid: new OpenIdClient(truvera),
    verify: new VerifyClient(truvera),
  };

  return buildHandlerMap(clients);
}
