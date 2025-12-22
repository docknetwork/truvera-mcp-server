import type { TruveraClient } from "../clients/truvera.js";
import type { DidClient } from "../features/dids/client.js";
import type { CredentialsClient } from "../features/credentials/client.js";
import type { PresentationsClient } from "../features/presentations/client.js";
import type { RegistriesClient } from "../features/registries/client.js";
import type { SchemasClient } from "../features/schemas/client.js";
import type { ProfilesClient } from "../features/profiles/client.js";
import type { WebhooksClient } from "../features/webhooks/client.js";
import type { TemplatesClient } from "../features/templates/client.js";
import type { SubaccountsClient } from "../features/subaccounts/client.js";
import type { TeamsClient } from "../features/teams/client.js";
import type { MessagingClient } from "../features/messaging/client.js";
import type { OpenIdClient } from "../features/openid/client.js";
import type { TrustRegistriesClient } from "../features/trustRegistries/client.js";
import type { DataClient } from "../features/data/client.js";
import type { KeysClient } from "../features/keys/client.js";
import type { JobsClient } from "../features/jobs/client.js";
import type { VerifyClient } from "../features/verify/client.js";

import type { ToolDef, ToolHandler } from "./types.js";

import { toolDefs as truveraDefs, getHandlers as getTruveraHandlers } from "./truveraTool.js";
import { toolDefs as didsDefs, getHandlers as getDidsHandlers } from "../features/dids/tools.js";
import { toolDefs as credentialsDefs, getHandlers as getCredentialsHandlers } from "../features/credentials/index.js";
import { toolDefs as presentationsDefs, getHandlers as getPresentationsHandlers } from "../features/presentations/index.js";
import { toolDefs as registriesDefs, getHandlers as getRegistriesHandlers } from "../features/registries/index.js";
import { toolDefs as schemasDefs, getHandlers as getSchemasHandlers } from "../features/schemas/index.js";
import { toolDefs as profilesDefs, getHandlers as getProfilesHandlers } from "../features/profiles/index.js";
import { toolDefs as webhooksDefs, getHandlers as getWebhooksHandlers } from "../features/webhooks/index.js";
import { toolDefs as templatesDefs, getHandlers as getTemplatesHandlers } from "../features/templates/index.js";
import { toolDefs as subaccountsDefs, getHandlers as getSubaccountsHandlers } from "../features/subaccounts/index.js";
import { toolDefs as teamsDefs, getHandlers as getTeamsHandlers } from "../features/teams/index.js";
import { toolDefs as messagingDefs, getHandlers as getMessagingHandlers } from "../features/messaging/index.js";
import { toolDefs as openidDefs, getHandlers as getOpenidHandlers } from "../features/openid/index.js";
import { toolDefs as trustRegistriesDefs, getHandlers as getTrustRegistriesHandlers } from "../features/trustRegistries/index.js";
import { toolDefs as dataDefs, getHandlers as getDataHandlers } from "../features/data/index.js";
import { toolDefs as keysDefs, getHandlers as getKeysHandlers } from "../features/keys/index.js";
import { toolDefs as jobsDefs, getHandlers as getJobsHandlers } from "../features/jobs/index.js";
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
    ...webhooksDefs,
    ...templatesDefs,
    ...subaccountsDefs,
    ...teamsDefs,
    ...messagingDefs,
    ...openidDefs,
    ...trustRegistriesDefs,
    ...dataDefs,
    ...keysDefs,
    ...jobsDefs,
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
  webhooks: WebhooksClient;
  templates: TemplatesClient;
  subaccounts: SubaccountsClient;
  teams: TeamsClient;
  messaging: MessagingClient;
  openid: OpenIdClient;
  trustRegistries: TrustRegistriesClient;
  data: DataClient;
  keys: KeysClient;
  jobs: JobsClient;
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
    getWebhooksHandlers(clients.webhooks),
    getTemplatesHandlers(clients.templates),
    getSubaccountsHandlers(clients.subaccounts),
    getTeamsHandlers(clients.teams),
    getMessagingHandlers(clients.messaging),
    getOpenidHandlers(clients.openid),
    getTrustRegistriesHandlers(clients.trustRegistries),
    getDataHandlers(clients.data),
    getKeysHandlers(clients.keys),
    getJobsHandlers(clients.jobs),
    getVerifyHandlers(clients.verify),
  ];

  for (const src of sources) {
    for (const [name, handler] of src) {
      handlers.set(name, handler);
    }
  }

  return handlers;
}
