/**
 * OpenID Authentication Provider Configuration
 */
export interface OpenIDAuthProviderOptions {
  url: string;
  scope?: string[];
  clientId: string;
  clientSecret: string;
  claimsSource?: string;
  requestParameters?: Record<string, unknown>;
}

/**
 * POST /openid/issuers
 * Create an OpenID issuer configuration
 */
export interface CreateIssuerRequest {
  credentialOptions: {
    credential: {
      context?: string | Array<string | Record<string, unknown>>;
      id?: string;
      previousCredentialId?: string;
      rootCredentialId?: string;
      name?: string;
      description?: string;
      issuanceDate?: string;
      expirationDate?: string;
      issuer: string | Record<string, unknown>;
      subject: Record<string, unknown> | Array<Record<string, unknown>>;
      type?: string[];
      schema?: string | Record<string, unknown>;
      status?: Record<string, unknown> | string;
    };
    algorithm?: 'ed25519' | 'dockbbs' | 'bbdt16';
    distribute?: boolean;
    format?: 'jsonld' | 'jwt' | 'sdjwt';
    revocable?: boolean;
  };
  authProvider?: OpenIDAuthProviderOptions;
  claimMap?: Record<string, string>;
  singleUse?: boolean;
}

/**
 * POST /openid/credential-offers
 * Create a credential offer from an issuer
 */
export interface CreateCredentialOfferRequest {
  id: string;
  requestParameters?: Record<string, unknown>;
}

export interface OpenIdCredentialOfferResponse {
  credential_offer: {
    credential_issuer: string;
    credentials: string[];
  };
}
