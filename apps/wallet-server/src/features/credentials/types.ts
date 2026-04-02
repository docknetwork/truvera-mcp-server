/**
 * Credential types
 */

export interface CredentialInfo {
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject?: Record<string, any>;
  [key: string]: any;
}

export interface CredentialListResult {
  credentials: CredentialInfo[];
  count: number;
}

export interface ImportCredentialResult {
  success: boolean;
  credential?: CredentialInfo;
  message?: string;
}
