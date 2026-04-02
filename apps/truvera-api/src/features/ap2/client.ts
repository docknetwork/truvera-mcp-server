/**
 * AP2 Client
 * Handles AP2 mandate issuance and verification using Truvera API
 * Supports both direct issuance (with subject_did) and credential offer flow (without subject_did)
 */

import type { TruveraClient } from "../../clients/truvera.js";
import type { OpenIdClient } from "../openid/client.js";
import type {
  CartMandate,
  IntentMandate,
  PaymentMandate,
  DisplayItem,
  Amount,
  ShoppingIntent,
} from "./types.js";
import { getCachedSchema } from "./schema-fetcher.js";
import { getSubjectIdFromCredential, isDid } from "../../tools/utils.js";

/**
 * Request to issue a Cart Mandate
 */
export interface IssueCartMandateRequest {
  mandate_id: string;
  cart_items: Array<{ label: string; currency: string; value: number }>;
  total_amount: { currency: string; value: number };
  payment_method: string;
  merchant_id: string;
  payer_id: string;
  payment_processor_url?: string;
  issuer_did: string;
  /**
   * Optional: Subject DID (holder/payer).
   * - If provided: Issues credential immediately and binds it to this DID
   * - If omitted: Creates a credential offer that can be claimed later via QR code
   */
  subject_did?: string;
}

/**
 * Request to issue an Intent Mandate
 */
export interface IssueIntentMandateRequest {
  mandate_id: string;
  shopping_prompt: string;
  budget_max_currency: string;
  budget_max_value: number;
  ttl_seconds?: number;
  product_categories?: string[];
  specific_skus?: string[];
  merchant_preference?: string;
  payment_methods?: string[];
  refundable?: boolean;
  payer_id: string;
  payee_id?: string;
  issuer_did: string;
  /**
   * Optional: Subject DID (holder/payer).
   * - If provided: Issues credential immediately and binds it to this DID
   * - If omitted: Creates a credential offer that can be claimed later via QR code
   */
  subject_did?: string;
}

/**
 * Request to issue a Payment Mandate
 */
export interface IssuePaymentMandateRequest {
  payment_mandate_id: string;
  payment_details_id: string;
  total_currency: string;
  total_value: number;
  payment_method: string;
  merchant_agent?: string;
  shopping_agent?: string;
  human_present: boolean;
  refund_period_days?: number;
  user_authorization?: string;
  issuer_did: string;
  /**
   * Optional: Subject DID (holder/payer).
   * - If provided: Issues credential immediately and binds it to this DID
   * - If omitted: Creates a credential offer that can be claimed later via QR code
   */
  subject_did?: string;
}

/**
 * Response for mandate issuance - either a credential or an offer
 */
export interface MandateIssuanceResponse {
  /** Type of response: 'credential' for direct issuance, 'offer' for QR code flow */
  type: 'credential' | 'offer';
  /** Issued credential (when type is 'credential') */
  credential?: any;
  /** Offer details (when type is 'offer') */
  offer?: {
    /** OpenID issuer ID */
    issuerId: string;
    /** Full credential offer URL for QR code (openid-credential-offer://...) */
    offerUrl: string;
    /** Credential offer URI for API access */
    offerUri?: string;
  };
}

/**
 * AP2 Client for mandate operations
 * Supports both direct credential issuance and credential offer flows
 */
export class AP2Client {
  constructor(
    private truveraClient: TruveraClient,
    private openIdClient: OpenIdClient
  ) {}

  /**
   * Resolve JSON-LD context URL from a schema URL.
   *
   * Truvera schema documents expose `$metadata.uris.jsonLdContext`.
   * When present, use it in VC `@context`; otherwise fall back to the schema URL.
   */
  private resolveContextUrl(schemaUrl: string): string {
    const cached = getCachedSchema(schemaUrl) as
      | {
          $metadata?: {
            uris?: {
              jsonLdContext?: unknown;
            };
          };
        }
      | undefined;

    const jsonLdContext = cached?.$metadata?.uris?.jsonLdContext;
    return typeof jsonLdContext === "string" && jsonLdContext.length > 0
      ? jsonLdContext
      : schemaUrl;
  }

  /**
   * Get schema URLs from environment
   */
  private getSchemaUrls() {
    return {
      cart: process.env.AP2_CART_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/cart-mandate/v1",
      intent: process.env.AP2_INTENT_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/intent-mandate/v1",
      payment: process.env.AP2_PAYMENT_MANDATE_SCHEMA_URL || "https://ap2-protocol.org/schemas/payment-mandate/v1",
    };
  }

  /**
   * Helper: Issue credential directly (when subject_did is provided)
   */
  private async issueCredentialDirect(credentialData: any) {
    const subjectId = getSubjectIdFromCredential(credentialData);
    const distribute = isDid(subjectId);

    const result = await this.truveraClient.request({
      method: "POST",
      endpoint: "/credentials",
      body: {
        credential: credentialData,
        ...(distribute ? { distribute: true } : {}),
      },
    });

    if (result.success) {
      return {
        success: true,
        data: {
          type: 'credential' as const,
          credential: result.data,
        },
      };
    }
    return result;
  }

  /**
   * Routes issuance: issues directly when subjectDid is provided, otherwise creates a credential offer.
   */
  private async routeIssuance(credentialData: any, subjectDid?: string) {
    if (subjectDid) {
      return this.issueCredentialDirect(credentialData);
    } else {
      return this.createCredentialOffer(credentialData);
    }
  }

  /**
   * Helper: Create credential offer (when subject_did is omitted)
   */
  private async createCredentialOffer(credentialData: any) {
    // The /openid/issuers endpoint uses Truvera's own field names:
    //   `context`  (not `@context`)
    //   `subject`  (not `credentialSubject`)
    // Destructure the W3C-shaped credentialData and remap before sending.
    const { "@context": context, credentialSubject, ...restCredential } = credentialData;

    // Step 1: Create OpenID issuer with mandate template
    const issuerResult = await this.openIdClient.createIssuer({
      credentialOptions: {
        credential: {
          ...restCredential,
          context,
          // Use placeholder for subject - will be filled when claimed
          subject: {
            ...credentialSubject,
            id: "{{holder_did}}", // Template variable for wallet claiming
          },
        },
        format: 'jsonld',
        algorithm: 'ed25519',
      },
      singleUse: true, // One-time use offer
    });

    if (!issuerResult.success) {
      return issuerResult;
    }

    const issuerId = (issuerResult.data as any).id;

    // Step 2: Create credential offer from issuer
    const offerResult = await this.openIdClient.createCredentialOffer({
      id: issuerId,
    });

    if (!offerResult.success) {
      return offerResult;
    }

    const offerData = offerResult.data as any;
    
    return {
      success: true,
      data: {
        type: 'offer' as const,
        offer: {
          issuerId,
          offerUrl: offerData.url, // API returns `url` field (openid-credential-offer://...)
          offerUri: offerData.offerUri,
        },
      },
    };
  }

  /**
   * Issue a Cart Mandate (Human-Present)
   * 
   * Two modes:
   * - With subject_did: Issues credential immediately
   * - Without subject_did: Creates credential offer for QR code claiming
   */
  async issueCartMandate(request: IssueCartMandateRequest) {
    const schemaUrls = this.getSchemaUrls();
    const cartContextUrl = this.resolveContextUrl(schemaUrls.cart);
    
    // Build cart mandate structure
    const displayItems: DisplayItem[] = request.cart_items.map((item) => ({
      label: item.label,
      amount: {
        currency: item.currency,
        value: item.value,
      },
    }));

    const cartMandate: CartMandate = {
      contents: {
        id: request.mandate_id,
        user_signature_required: true,
        payment_request: {
          method_data: [
            {
              supported_methods: request.payment_method,
              data: request.payment_processor_url
                ? { payment_processor_url: request.payment_processor_url }
                : undefined,
            },
          ],
          details: {
            id: request.mandate_id,
            displayItems,
            total: {
              label: "Total",
              amount: request.total_amount,
            },
          },
          options: {
            requestPayerName: false,
            requestPayerEmail: false,
            requestPayerPhone: false,
            requestShipping: true,
            shippingType: null,
          },
        },
      },
      merchant_signature: "", // Will be signed by Truvera
      timestamp: new Date().toISOString(),
    };

    // Build W3C Verifiable Credential structure
    const credentialData = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        cartContextUrl,
      ],
      type: ["VerifiableCredential", "CartMandate"],
      issuer: {
        id: request.issuer_did,
      },
      credentialSubject: {
        id: request.subject_did || "{{holder_did}}", // Placeholder if no subject_did
        mandateId: request.mandate_id,
        mandateType: "CartMandate",
        cartMandate,
        merchantId: request.merchant_id,
        payerId: request.payer_id,
      },
    };

    return this.routeIssuance(credentialData, request.subject_did);
  }

  /**
   * Issue an Intent Mandate (Human-Not-Present)
   * 
   * Two modes:
   * - With subject_did: Issues credential immediately
   * - Without subject_did: Creates credential offer for QR code claiming
   */
  async issueIntentMandate(request: IssueIntentMandateRequest) {
    const schemaUrls = this.getSchemaUrls();
    const intentContextUrl = this.resolveContextUrl(schemaUrls.intent);
    const defaultTTL = parseInt(process.env.AP2_DEFAULT_TTL_SECONDS || "3600", 10);

    const shoppingIntent: ShoppingIntent = {
      prompt: request.shopping_prompt,
      budget_max: {
        currency: request.budget_max_currency,
        value: request.budget_max_value,
      },
    };

    if (request.product_categories) {
      shoppingIntent.product_categories = request.product_categories;
    }
    if (request.specific_skus) {
      shoppingIntent.specific_skus = request.specific_skus;
    }
    if (request.merchant_preference) {
      shoppingIntent.merchant_preference = request.merchant_preference;
    }
    if (request.refundable !== undefined) {
      shoppingIntent.refundable = request.refundable;
    }

    const intentMandate: IntentMandate = {
      contents: {
        id: request.mandate_id,
        payer_id: request.payer_id,
        payee_id: request.payee_id,
        shopping_intent: shoppingIntent,
        payment_methods: request.payment_methods,
        prompt_playback: request.shopping_prompt,
        ttl: request.ttl_seconds || defaultTTL,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Build W3C Verifiable Credential structure
    const credentialData = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        intentContextUrl,
      ],
      type: ["VerifiableCredential", "IntentMandate"],
      issuer: {
        id: request.issuer_did,
      },
      credentialSubject: {
        id: request.subject_did || "{{holder_did}}", // Placeholder if no subject_did
        mandateId: request.mandate_id,
        mandateType: "IntentMandate",
        intentMandate,
        payerId: request.payer_id,
        payeeId: request.payee_id,
      },
    };

    return this.routeIssuance(credentialData, request.subject_did);
  }

  /**
   * Issue a Payment Mandate (Network Visibility)
   * 
   * Two modes:
   * - With subject_did: Issues credential immediately
   * - Without subject_did: Creates credential offer for QR code claiming
   */
  async issuePaymentMandate(request: IssuePaymentMandateRequest) {
    const schemaUrls = this.getSchemaUrls();
    const paymentContextUrl = this.resolveContextUrl(schemaUrls.payment);
    const timestamp = new Date().toISOString();

    const paymentMandate: PaymentMandate = {
      paymentMandateContents: {
        paymentMandateId: request.payment_mandate_id,
        paymentDetailsId: request.payment_details_id,
        paymentDetailsTotal: {
          label: "Total",
          amount: {
            currency: request.total_currency,
            value: String(request.total_value),
          },
          ...(request.refund_period_days !== undefined
            ? { refundPeriod: request.refund_period_days }
            : {}),
        },
        paymentResponse: {
          requestId: request.payment_details_id,
          methodName: request.payment_method,
          details: {},
        },
        ...(request.merchant_agent ? { merchantAgent: request.merchant_agent } : {}),
        ...(request.shopping_agent ? { shoppingAgent: request.shopping_agent } : {}),
        humanPresent: request.human_present,
        timestamp,
      },
      userAuthorization: request.user_authorization ?? "pending-user-authorization",
    };

    // Build W3C Verifiable Credential structure
    const credentialData = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        paymentContextUrl,
      ],
      type: ["VerifiableCredential", "PaymentMandate"],
      issuer: {
        id: request.issuer_did,
      },
      credentialSubject: {
        id: request.subject_did || "{{holder_did}}", // Placeholder if no subject_did
        ...paymentMandate,
      },
    };

    return this.routeIssuance(credentialData, request.subject_did);
  }

  /**
   * Verify a mandate credential
   * @param credential - The full W3C Verifiable Credential document (not just the ID)
   */
  async verifyMandate(credential: unknown) {
    // Verify the credential directly
    return this.truveraClient.request({
      method: "POST",
      endpoint: "/verify",
      body: credential,
    });
  }
}
