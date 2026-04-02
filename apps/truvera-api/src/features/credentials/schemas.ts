import { components as shared } from "../shared/schemas.js";


export const components = {
  "schemas": {
    ...shared.schemas,
    "Context": {
      "description": "JSON-LD context array of strings or single string",
      "example": "https://docknetwork.github.io/vc-schemas/basic-credential.json-ld",
      "oneOf": [
        {
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "object"
              }
            ]
          }
        },
        {
          "type": "string"
        }
      ]
    },
    "DID": {
      "description": "DID as fully qualified, typically. `did:cheqd:`",
      "type": "string",
      "minimum": 32,
      "example": "did:cheqd:testnet:ac2b9027-ec1a-4ee2-aad1-1e316e7d6f59"
    },
    "Credential": {
      "description": "Format to create credentials with the API",
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Optional credential ID, ideally as a URI or UUID. Leave blank to auto generate",
          "example": ""
        },
        "previousCredentialId": {
          "type": "string",
          "description": "Optional credential ID that denotes the previous credential in the delegation chain",
          "example": ""
        },
        "rootCredentialId": {
          "type": "string",
          "description": "Optional credential ID that denotes the delegation root",
          "example": ""
        },
        "name": {
          "type": "string",
          "example": "Basic Credential",
          "description": "Optional name to be inserted in the credential"
        },
        "description": {
          "type": "string",
          "example": "My first credential",
          "description": "Optional description to be inserted in the credential"
        },
        "schema": {
          "example": "https://docknetwork.github.io/vc-schemas/basic-credential.json",
          "oneOf": [
            {
              "type": "object"
            },
            {
              "type": "string",
              "format": "uri"
            }
          ]
        },
        "context": {
          "$ref": "#/components/schemas/Context"
        },
        "type": {
          "example": [
            "BasicCredential"
          ],
          "description": "Custom type, leave empty to auto generate where possible",
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "subject": {
          "example": {
            "id": "did:key:z6MkqBcwvYurNSSqyBkxavv4fkaq2iu3v3YGMbdyfa4bVNxD",
            "name": "A. Holder"
          },
          "oneOf": [
            {
              "type": "object"
            },
            {
              "type": "array",
              "items": { "type": "object" }
            }
          ]
        },
        "issuer": {
          "oneOf": [
            {
              "type": "string",
              "$ref": "#/components/schemas/DID"
            },
            {
              "type": "object"
            }
          ]
        },
        "issuanceDate": {
          "type": "string",
          "format": "date-time"
        },
        "expirationDate": {
          "type": "string",
          "format": "date-time",
          "example": "2030-09-20T00:13:59.270Z"
        },
        "status": {
          "description": "Revocation registry id or user supplied status object",
          "example": null,
          "oneOf": [
            {
              "type": "object"
            },
            {
              "type": "string"
            }
          ]
        }
      }
    },
    "CredentialIssueRequest": {
      "type": "object",
      "required": [
        "credential"
      ],
      "properties": {
        "algorithm": {
          "type": "string",
          "default": "ed25519",
          "enum": [
            "ed25519",
            "dockbbs",
            "bbdt16"
          ],
          "maxLength": 32,
          "minLength": 4,
          "description": "Optional. Specifies which signing algorithm to use to sign the issued credential. Defaults to ed25519, for ZKP credendials use dockbbs.",
          "example": "dockbbs"
        },
        "distribute": {
          "type": "boolean",
          "default": false,
          "description": "Whether to distribute the credential or not based on subject DID or email address. Not required for OpenID flows.",
          "example": false
        },
        "format": {
          "type": "string",
          "enum": [
            "jsonld",
            "jwt",
            "sdjwt"
          ],
          "description": "Specifies the output format of the credential, either jsonld or jwt. Defaults to jsonld.",
          "example": "jsonld"
        },
        "credential": {
          "$ref": "#/components/schemas/Credential"
        },
        "revocable": {
          "type": "boolean",
          "default": false,
          "description": "Whether the credential can be revoked or not. If true the revocation registry will be automatically provisioned.",
          "example": true
        }
      }
    },
    "ListCredentialsOptions": shared.schemas.PaginationOptions,
    "GetCredentialRequest": {
      "type": "object",
      "required": ["id"],
      "properties": {
        "id": { "type": "string" },
        "password": { "type": "string" }
      }
    },
    "DeleteCredentialRequest": {
      "type": "object",
      "required": ["id"],
      "properties": { "id": { "type": "string" } }
    }
  }
};

