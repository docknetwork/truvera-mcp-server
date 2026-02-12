/**
 * Interval time unit
 */
export interface IntervalObject {
  amount: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
}

/**
 * Indy proof request attribute specification
 */
export interface IndyProofReqAttrSpec {
  /** Attribute name */
  name?: string;
  /** Attribute name group */
  names?: string[];
}

/**
 * POST /proof-templates
 * Create a proof template
 */
export interface CreateProofTemplateRequest {
  name: string;
  cedarVerificationPolicy?: string;
  request?: Record<string, unknown>;
  expirationTime?: IntervalObject;
  did?: string;
}

/**
 * POST /proof-templates/{templateId}/request
 * Create a proof request from template
 */
export interface CreateProofRequest {
  attributes?: Record<string, IndyProofReqAttrSpec>;
  name?: string;
  cedarVerificationPolicy?: string;
  template?: string;
  nonce?: string;
  did?: string;
  request?: Record<string, unknown>;
}

/**
 * Arguments for creating a proof request from template
 */
export interface CreateProofRequestArgs {
  templateId?: string;
  body: CreateProofRequest;
}
