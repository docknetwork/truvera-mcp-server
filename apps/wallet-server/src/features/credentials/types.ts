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

export interface ProofResponseCandidate {
  credentialId: string;
  type: string[];
  issuer?: string;
  issuanceDate?: string;
  availableAttributes: string[];
  supportsSelectiveDisclosure: boolean;
}

export interface RespondToProofRequestParams {
  proofRequest: Record<string, unknown>;
  selectedCredentialIds?: string[];
  attributesToRevealByCredential?: Record<string, string[]>;
  interactive?: boolean;
  autoSubmit?: boolean;
}

export interface PresentedCredentialDetail {
  id?: string;
  type?: string[];
  issuer?: string;
  credentialSubject?: Record<string, unknown>;
}

export interface SharedPresentationDetails {
  holder?: string;
  proofType?: string;
  credentialCount: number;
  credentials: PresentedCredentialDetail[];
}

export interface ProofSubmissionResult {
  submitted: boolean;
  responseUrl?: string;
  verifierResponse?: unknown;
}

export interface GetCredentialResult {
  success: boolean;
  credential?: CredentialInfo;
  message?: string;
}

export interface RespondToProofRequestResult {
  success: boolean;
  status: "completed" | "needs_input" | "failed";
  presentation?: Record<string, any>;
  selectedCredentialIds?: string[];
  selectedDID?: string;
  candidateCredentials?: ProofResponseCandidate[];
  requiredDecisions?: string[];
  submission?: ProofSubmissionResult;
  sharedPresentationDetails?: SharedPresentationDetails;
  message?: string;
  errors?: any[];
  warnings?: any[];
}
