export interface CreateDelegationOfferParams {
  credentialId: string;
  delegationPolicy: Record<string, unknown>;
  delegationRole: string;
  issuerDID?: string;
  expiresInMs?: number;
}

export interface AcceptDelegationOfferParams {
  offerId: string;
}

export interface HandleDelegationMessageParams {
  message: string | Record<string, unknown>;
}

export interface DelegationOffer {
  id: string;
  credentialId?: string;
  issuerDID?: string;
  issuerName?: string;
  delegationRole?: string;
  status: "sent" | "requested" | "accepted" | "rejected";
  sentAt?: string;
  expiresAt?: string;
  updatedAt?: string | null;
  holderDID?: string;
}

export interface CreateDelegationOfferResult {
  offer: DelegationOffer;
  oobUrl: string;
}
