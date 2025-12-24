/**
 * POST /openid/credential-offer
 */
export interface OpenIdCredentialOfferRequest {
  credentialType: string;

  /**
   * @default false
   */
  preAuthorized?: boolean;

  /**
   * @default true
   */
  userPinRequired?: boolean;
}

export interface OpenIdCredentialOfferResponse {
  credential_offer: {
    credential_issuer: string;
    credentials: string[];
  };
}

/**
 * POST /openid/token
 */
export interface OpenIdTokenRequest {
  grant_type: string;
  pre_authorized_code?: string;
  user_pin?: string;
}

export interface OpenIdTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}
