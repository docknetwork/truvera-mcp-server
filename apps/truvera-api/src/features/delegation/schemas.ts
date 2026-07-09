export const components = {
  schemas: {
    GetDelegationRuleRequest: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Delegation rule set ID" },
      },
    },
    DelegatableRevocationRequest: {
      type: "object",
      required: ["action", "credentialId"],
      properties: {
        action: {
          type: "string",
          enum: ["revoke", "unrevoke"],
          description: "Whether to revoke or unrevoke the credential",
        },
        credentialId: {
          type: "string",
          description: "ID of the delegatable credential to revoke or unrevoke. The caller must be a member of the credential's delegation chain — only participants with delegated authority can invoke this endpoint.",
        },
        registryId: {
          type: "string",
          description: "Optional revocation registry ID (Hex32 format)",
        },
      },
    },
  },
};
