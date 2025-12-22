import type { TruveraClient } from "../clients/truvera.js";
import type { DidClient } from "../clients/dids.js";
import type { CredentialsClient } from "../clients/credentials.js";
import type { PresentationsClient } from "../clients/presentations.js";
import type { RegistriesClient } from "../clients/registries.js";
import type { SchemasClient } from "../clients/schemas.js";
import type { ProfilesClient } from "../clients/profiles.js";
import type { WebhooksClient } from "../clients/webhooks.js";
import type { TemplatesClient } from "../clients/templates.js";
import type { SubaccountsClient } from "../clients/subaccounts.js";
import type { TeamsClient } from "../clients/teams.js";
import type { MessagingClient } from "../clients/messaging.js";
import type { OpenIdClient } from "../clients/openid.js";
import type { TrustRegistriesClient } from "../clients/trustRegistries.js";
import type { DataClient } from "../clients/data.js";
import type { KeysClient } from "../clients/keys.js";
import type { JobsClient } from "../clients/jobs.js";
import type { VerifyClient } from "../clients/verify.js";

import type { ToolDef, ToolHandler } from "./types.js";

import { toolDefs as truveraDefs, getHandlers as getTruveraHandlers } from "./truveraTool.js";
import { toolDefs as didsDefs, getHandlers as getDidsHandlers } from "./didsTools.js";
import { toolDefs as credentialsDefs, getHandlers as getCredentialsHandlers } from "./credentialsTools.js";
import { toolDefs as presentationsDefs, getHandlers as getPresentationsHandlers } from "./presentationsTools.js";
import { toolDefs as registriesDefs, getHandlers as getRegistriesHandlers } from "./registriesTools.js";
import { toolDefs as schemasDefs, getHandlers as getSchemasHandlers } from "./schemasTools.js";
import { toolDefs as profilesDefs, getHandlers as getProfilesHandlers } from "./profilesTools.js";
import { toolDefs as webhooksDefs, getHandlers as getWebhooksHandlers } from "./webhooksTools.js";
import { toolDefs as templatesDefs, getHandlers as getTemplatesHandlers } from "./templatesTools.js";
import { toolDefs as subaccountsDefs, getHandlers as getSubaccountsHandlers } from "./subaccountsTools.js";
import { toolDefs as teamsDefs, getHandlers as getTeamsHandlers } from "./teamsTools.js";
import { toolDefs as messagingDefs, getHandlers as getMessagingHandlers } from "./messagingTools.js";
import { toolDefs as openidDefs, getHandlers as getOpenidHandlers } from "./openidTools.js";
import { toolDefs as trustRegistriesDefs, getHandlers as getTrustRegistriesHandlers } from "./trustRegistriesTools.js";
import { toolDefs as dataDefs, getHandlers as getDataHandlers } from "./dataTools.js";
import { toolDefs as keysDefs, getHandlers as getKeysHandlers } from "./keysTools.js";
import { toolDefs as jobsDefs, getHandlers as getJobsHandlers } from "./jobsTools.js";
import { toolDefs as verifyDefs, getHandlers as getVerifyHandlers } from "./verifyTools.js";

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
