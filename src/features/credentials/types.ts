import { VerifiableCredential } from '../shared/credentials';
import { PaginatedResponse, PaginationParams } from '../shared/pagination';

/**
 * POST /credentials/issue
 */
export interface IssueCredentialRequest {
  credential: VerifiableCredential;

  /**
   * Output format
   * @default "jsonld"
   */
  format?: 'jsonld' | 'jwt';

  /**
   * Persist credential in Truvera storage
   * @default true
   */
  persist?: boolean;

  /**
   * Distribute credential to holder
   * @default false
   */
  distribute?: boolean;
}

export interface IssueCredentialResponse {
  credential: VerifiableCredential | string;
}

/**
 * GET /credentials
 */
export interface ListCredentialsQuery extends PaginationParams {}

export type ListCredentialsResponse =
  PaginatedResponse<VerifiableCredential>;

/**
 * GET /credentials/{id}
 */
export interface GetCredentialResponse {
  credential: VerifiableCredential;
}
