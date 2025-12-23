// Truvera API - Issue Credential Endpoint Types
// POST /credentials

/**
 * Request body for issuing a credential
 */
export interface IssueCredentialRequest {
  /** Whether to store an encrypted version of this credential. Defaults to false. */
  persist?: boolean;
  
  /** Password used to encrypt the credential if you choose to store it (min: 4, max: 32 chars) */
  password?: string;
  
  /** Anchor the credential on the blockchain or not (deprecated) */
  anchor?: boolean;
  
  /** The credential template UUID, only required for PDF and web rendering customization */
  template?: string;
  
  /** The holder's DID for DID distribution, optional. Not required for OpenID flows. */
  recipientDID?: string;
  
  /** The holder's email for email distribution, optional. Not required for OpenID flows. */
  recipientEmail?: string;
  
  /** 
   * Specifies which signing algorithm to use. Defaults to 'ed25519'. 
   * Use 'dockbbs' for ZKP credentials.
   */
  algorithm?: 'ed25519' | 'dockbbs' | string;
  
  /** Whether to distribute the credential based on subject DID or email address */
  distribute?: boolean;
  
  /** Specifies the output format of the credential */
  format?: 'jsonld' | 'jwt' | 'sdjwt';
  
  /** The credential data to be issued */
  credential: CredentialData;
  
  /** Whether the credential can be revoked or not */
  revocable?: boolean;
}

/**
 * Credential data structure
 */
export interface CredentialData {
  /** Credential ID (optional, auto-generated if not provided) */
  id?: string;
  
  /** Previous credential ID for credential chains */
  previousCredentialId?: string;
  
  /** Root credential ID for credential chains */
  rootCredentialId?: string;
  
  /** Human-readable name for the credential */
  name?: string;
  
  /** Description of the credential */
  description?: string;
  
  /** Schema URI that defines the credential structure */
  schema?: string;
  
  /** JSON-LD context URI or embedded context */
  context?: string | string[] | Record<string, any>;
  
  /** Array of credential types (must include 'VerifiableCredential') */
  type: string[];
  
  /** The credential subject(s) - can be a single object or array */
  subject: CredentialSubject | CredentialSubject[];
  
  /** DID of the credential issuer (must be controlled by your Truvera account) */
  issuer: string | IssuerObject;
  
  /** ISO 8601 datetime when the credential was issued */
  issuanceDate?: string;
  
  /** ISO 8601 datetime when the credential expires */
  expirationDate?: string;
  
  /** Credential status for revocation (registry.id value) */
  status?: CredentialStatus | null;
}

/**
 * Credential subject containing the claims
 */
export interface CredentialSubject {
  /** DID of the credential holder (optional) */
  id?: string;
  
  /** Additional claims (flexible structure based on schema) */
  [key: string]: any;
}

/**
 * Issuer as an object
 */
export interface IssuerObject {
  /** Issuer DID */
  id: string;
  
  /** Additional issuer properties */
  [key: string]: any;
}

/**
 * Credential status for revocation
 */
export interface CredentialStatus {
  /** Status type */
  type: string;
  
  /** Revocation registry ID */
  id: string;
  
  /** Additional status properties */
  [key: string]: any;
}

/**
 * Response from issuing a credential (200 OK)
 */
export interface IssueCredentialResponse {
  /** JSON-LD context */
  '@context': string | string[];
  
  /** Credential ID */
  id: string;
  
  /** Credential types */
  type: string[];
  
  /** Credential subject */
  credentialSubject: CredentialSubject | CredentialSubject[];
  
  /** Issuance date */
  issuanceDate: string;
  
  /** Cryptographic proof */
  proof: CredentialProof;
  
  /** Issuer DID */
  issuer: string | IssuerObject;
  
  /** Expiration date (optional) */
  expirationDate?: string;
  
  /** Credential status (optional) */
  credentialStatus?: CredentialStatus;
}

/**
 * Cryptographic proof
 */
export interface CredentialProof {
  /** Signature type */
  type: string;
  
  /** When the proof was created */
  created: string;
  
  /** Verification method DID */
  verificationMethod: string;
  
  /** Purpose of the proof */
  proofPurpose: string;
  
  /** The actual signature value */
  proofValue: string;
}

/**
 * Error response (400, 401, 402, 404)
 */
export interface ErrorResponse {
  /** Error message */
  message?: string;
  
  /** Error code */
  code?: string;
  
  /** Additional error details */
  [key: string]: any;
}

/**
 * Example usage of the types
 */
export const exampleCredentialRequest: IssueCredentialRequest = {
  persist: false,
  algorithm: 'dockbbs',
  distribute: false,
  format: 'jsonld',
  revocable: true,
  credential: {
    name: 'Basic Credential',
    description: 'My first credential',
    schema: 'https://docknetwork.github.io/vc-schemas/basic-credential.json',
    context: 'https://docknetwork.github.io/vc-schemas/basic-credential.json-ld',
    type: ['VerifiableCredential', 'BasicCredential'],
    subject: {
      id: 'did:key:z6MkqBcwvYurNSSqyBkxavv4fkaq2iu3v3YGMbdyfa4bVNxD',
      name: 'A. Holder'
    },
    issuer: 'did:cheqd:testnet:ac2b9027-ec1a-4ee2-aad1-1e316e7d6f59',
    issuanceDate: '2025-12-23T15:23:42.222Z',
    expirationDate: '2030-09-20T00:13:59.270Z',
    status: null
  }
};