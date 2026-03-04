/**
 * AP2 Client
 * Handles AP2 mandate issuance and verification using Truvera API
 */

import type { TruveraClient } from "../../clients/truvera.js";
import type {
  CartMandate,
  IntentMandate,
  PaymentMandate,
  DisplayItem,
  Amount,
  ShoppingIntent,
} from "./types.js";
import { getCachedSchema } from "./schema-fetcher.js";

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
  subject_did: string;
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
  subject_did: string;
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
  issuer_did: string;
  subject_did: string;
}

/**
 * AP2 Client for mandate operations
 */
export class AP2Client {
  constructor(private truveraClient: TruveraClient) {}

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
   * Issue a Cart Mandate (Human-Present)
   */
  async issueCartMandate(request: IssueCartMandateRequest) {
    const schemaUrls = this.getSchemaUrls();
    
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

    // Issue credential via Truvera API
    const credentialRequest = {
      schema: schemaUrls.cart,
      type: ["VerifiableCredential", "CartMandate"],
      issuer: request.issuer_did,
      subject: {
        id: request.subject_did,
        mandateId: request.mandate_id,
        mandateType: "CartMandate",
        cartMandate,
        merchantId: request.merchant_id,
        payerId: request.payer_id,
      },
    };

    return this.truveraClient.request({
      method: "POST",
      endpoint: "/credentials",
      body: credentialRequest,
    });
  }

  /**
   * Issue an Intent Mandate (Human-Not-Present)
   */
  async issueIntentMandate(request: IssueIntentMandateRequest) {
    const schemaUrls = this.getSchemaUrls();
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

    // Issue credential via Truvera API
    const credentialRequest = {
      schema: schemaUrls.intent,
      type: ["VerifiableCredential", "IntentMandate"],
      issuer: request.issuer_did,
      subject: {
        id: request.subject_did,
        mandateId: request.mandate_id,
        mandateType: "IntentMandate",
        intentMandate,
        payerId: request.payer_id,
        payeeId: request.payee_id,
      },
    };

    return this.truveraClient.request({
      method: "POST",
      endpoint: "/credentials",
      body: credentialRequest,
    });
  }

  /**
   * Issue a Payment Mandate (Network Visibility)
   */
  async issuePaymentMandate(request: IssuePaymentMandateRequest) {
    const schemaUrls = this.getSchemaUrls();

    const paymentMandate: PaymentMandate = {
      payment_mandate_contents: {
        payment_mandate_id: request.payment_mandate_id,
        payment_details_id: request.payment_details_id,
        payment_details_total: {
          label: "Total",
          amount: {
            currency: request.total_currency,
            value: request.total_value,
          },
          refund_period: request.refund_period_days,
        },
        payment_response: {
          request_id: request.payment_details_id,
          method_name: request.payment_method,
          details: {},
        },
        merchant_agent: request.merchant_agent,
        shopping_agent: request.shopping_agent,
        human_present: request.human_present,
        timestamp: new Date().toISOString(),
      },
    };

    // Issue credential via Truvera API
    const credentialRequest = {
      schema: schemaUrls.payment,
      type: ["VerifiableCredential", "PaymentMandate"],
      issuer: request.issuer_did,
      subject: {
        id: request.subject_did,
        mandateId: request.payment_mandate_id,
        mandateType: "PaymentMandate",
        paymentMandate,
        humanPresent: request.human_present,
      },
    };

    return this.truveraClient.request({
      method: "POST",
      endpoint: "/credentials",
      body: credentialRequest,
    });
  }

  /**
   * Verify a mandate credential
   */
  async verifyMandate(credentialId: string) {
    // Get the credential first
    const getResult = await this.truveraClient.request({
      method: "GET",
      endpoint: `/credentials/${credentialId}`,
    });

    if (!getResult.success) {
      return getResult;
    }

    // Verify the credential
    return this.truveraClient.request({
      method: "POST",
      endpoint: "/verify",
      body: {
        credential: getResult.data,
      },
    });
  }
}
