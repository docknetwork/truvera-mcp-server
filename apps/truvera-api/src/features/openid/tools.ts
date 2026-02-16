import type { OpenIdClient } from "./client.js";
import type { ToolDef, ToolHandler } from "@truvera/mcp-shared/tools";
import { formatResult } from "../../tools/utils.js";
import { components } from "./schemas.js";
import type { CreateIssuerRequest, CreateCredentialOfferRequest } from "./types.js";

export const toolDefs: ToolDef[] = [
  { name: "list_issuers", description: "Gets a list of OpenID issuers. GET /openid/issuers. Supports offset and limit pagination. For schema details, refer to the Truvera API spec: https://swagger-api.truvera.io/openapi.yaml", inputSchema: components.schemas.ListIssuersOptions },
  { 
    name: "create_issuer", 
    description: `Step 1 of 2: Creates an OID4VC issuer configuration. POST /openid/issuers.
  
  ⚠️ IMPORTANT: This creates the issuer configuration but does NOT create a claimable credential offer.
  After creating an issuer, you MUST call 'create_credential_offer' to generate the actual URL for QR codes.
  
  An issuer defines:
  - The DID that will sign credentials
  - The credential template (type, subject structure, expiration)
  - The authentication/authorization requirements
  
  For pre-authorized flow (no authentication):
  - Do NOT provide authProvider
  - Provide grants parameter with pre-authorized_code grant type
  
  For authorization flow (user authentication required):
  - Provide authProvider with OAuth/OIDC configuration
  - Do NOT provide grants parameter
  
  The returned 'qrUrl' is the issuer discovery URL (openid://discovery?issuer=...) 
  which is NOT what you want for wallet scanning. Use create_credential_offer next.
  
  For complete schema details including credentialOptions and authProvider structure, refer to:
  https://swagger-api.truvera.io/openapi.yaml
  
  ⚠️ CRITICAL: The credentialOptions object uses Truvera's credential schema (not W3C standard).
  Field names like 'subject' (NOT 'credentialSubject') are required.
  ALWAYS verify field names in the Truvera spec before constructing credentialOptions.`, 
    inputSchema: components.schemas.CreateIssuerRequest 
  },
  { 
    name: "create_credential_offer", 
    description: `Step 2 of 2: Creates a credential offer from an existing issuer. POST /openid/credential-offers.
  
  This generates the actual claimable credential offer that should be encoded in a QR code.
  Call this AFTER creating an issuer with 'create_issuer'.
  
  The returned URL will be in the format:
  openid-credential-offer://?credential_offer_uri=https://...
  
  This is the URL you should use for QR code generation.
  
  For pre-authorized flow:
  - The response includes a pre-authorized_code that allows instant claiming
  - user_pin_required indicates if a PIN is needed
  
  For authorization flow:
  - The wallet will redirect the user to authenticate via the authProvider
  - After authentication, the credential will be issued
  
  If the issuer is configured as singleUse, this offer can only be claimed once.
  
  For complete schema details including requestParameters, refer to:
  https://swagger-api.truvera.io/openapi.yaml`, 
    inputSchema: components.schemas.CreateCredentialOfferRequest 
  },
  { 
    name: "get_credential_offer", 
    description: `Retrieves details about a specific credential offer. GET /openid/credential-offers/{id}.
  
  Use this to check the status of a credential offer, including:
  - Whether it has been claimed (for singleUse offers)
  - The credential configuration
  - The pre-authorized code (for pre-auth flow)
  - The offer URL for QR code generation
  
  This is useful for debugging or verifying an offer before generating a QR code.
  
  For complete schema details, refer to the Truvera API spec:
  https://swagger-api.truvera.io/openapi.yaml`, 
    inputSchema: components.schemas.GetCredentialOfferRequest 
  },
];

export function getHandlers(openid: OpenIdClient): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  handlers.set("create_credential_offer", async (args) => formatResult(await openid.createCredentialOffer(args as CreateCredentialOfferRequest)));
  handlers.set("get_credential_offer", async (args) => {
    const { id } = args as { id?: string };
    if (!id) return { content: [{ type: "text", text: "Error: 'id' is required" }], isError: true };
    return formatResult(await openid.getCredentialOffer(id));
  });
  handlers.set("list_issuers", async (args) => formatResult(await openid.listIssuers(args || {})));
  handlers.set("create_issuer", async (args) => formatResult(await openid.createIssuer(args as CreateIssuerRequest)));

  return handlers;
}
