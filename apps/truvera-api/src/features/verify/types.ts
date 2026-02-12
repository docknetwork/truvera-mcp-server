import { VerifiableCredential } from '../shared/credentials';
import { VerifiablePresentation } from '../shared/presentation';
import { Proof } from '../shared/proof';

export type VerifyRequest =
  | VerifiableCredential
  | VerifiablePresentation
  | string; // JWT

export interface ProofVerificationResult {
  proof: Proof;
  verified: boolean;
  error?: string;
}

export interface VerifyResponse {
  verified: boolean;
  results?: ProofVerificationResult[];
}
