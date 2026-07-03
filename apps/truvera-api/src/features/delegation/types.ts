export interface DelegationRuleSet {
  id: string;
  name: string;
  createdAt: string;
  created?: string;
  updated?: string;
  policy: Record<string, unknown>;
  schemaIds: string[];
}

export interface DelegatableRevocationRequest {
  action: "revoke" | "unrevoke";
  credentialId: string;
  registryId?: string;
}
