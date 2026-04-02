/**
 * JSON Schemas for DID tool inputs
 */

export const getDefaultDIDSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};

export const createDIDSchema = {
  type: "object" as const,
  properties: {
    keyType: {
      type: "string",
      description: "Key type for the DID (ed25519, secp256k1, etc.)",
      default: "ed25519",
    },
  },
  required: [] as string[],
};

export const listDIDsSchema = {
  type: "object" as const,
  properties: {},
  required: [] as string[],
};
