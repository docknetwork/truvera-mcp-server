/**
 * JSON Schema definitions for message tool inputs
 */

export const fetchMessagesSchema = {
  type: "object" as const,
  properties: {},
  required: [],
  additionalProperties: false,
};

export const sendMessageSchema = {
  type: "object" as const,
  properties: {
    to: {
      type: "string" as const,
      description: "Recipient DID (e.g. did:key:z6Mk...)",
    },
    message: {
      type: "object" as const,
      description: "Message payload to send",
    },
    type: {
      type: "string" as const,
      description: "DIDComm message type URI (e.g. https://didcomm.org/basicmessage/1.0/message). Defaults to basic message.",
    },
    from: {
      type: "string" as const,
      description: "Sender DID. Defaults to the wallet's default DID.",
    },
  },
  required: ["to", "message"],
  additionalProperties: false,
};
