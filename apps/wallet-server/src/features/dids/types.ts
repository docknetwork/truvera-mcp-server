/**
 * DID Feature Types
 * Types for DID management operations
 */

export interface DIDInfo {
  id: string;
  controller?: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyBase58?: string;
    publicKeyMultibase?: string;
  }>;
}

export interface CreateDIDResult {
  did: string;
  didDocument: DIDInfo;
  keyRef: string;
}

export interface DIDListResult {
  dids: string[];
  count: number;
  defaultDID?: string;
}
