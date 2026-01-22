export const components = {
  schemas: {
    DID: {
      description: "Decentralized identifier (DID)",
      type: "string",
      example: "did:cheqd:testnet:ac2b9027-ec1a-4ee2-aad1-1e316e7d6f59",
    },
    Context: {
      description: "JSON-LD context array of strings or single string",
      oneOf: [
        { type: "array", items: { oneOf: [{ type: "string" }, { type: "object" }] } },
        { type: "string" }
      ]
    },
    PaginationOptions: {
      type: "object",
      properties: {
        offset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1 }
      }
    },
    ISODateString: {
      type: "string",
      format: "date-time"
    },
    IntervalObject: {
      type: "object",
      required: ["amount", "unit"],
      properties: {
        amount: { type: "number" },
        unit: { type: "string", enum: ["seconds", "minutes", "hours", "days", "weeks", "months", "years"] }
      }
    },
    IndyProofReqAttrSpec: {
      type: "object",
      properties: {
        name: {
          type: "string",
          example: "favouriteDrink",
          description: "Attribute name"
        },
        names: {
          type: "array",
          description: "Attribute name group",
          items: {
            type: "string",
            example: "age"
          }
        }
      }
    }
  }
};

