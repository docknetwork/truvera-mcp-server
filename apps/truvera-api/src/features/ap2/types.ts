/**
 * AP2 (Agent Payments Protocol) Types
 * Based on https://ap2-protocol.org/specification/
 */

/**
 * Monetary amount with currency
 */
export interface Amount {
  currency: string;
  value: number;
}

/**
 * Display item in a cart or payment request
 */
export interface DisplayItem {
  label: string;
  amount: Amount;
}

/**
 * Total amount for a transaction
 */
export interface Total {
  label: string;
  amount: Amount;
}

/**
 * Payment method data structure
 */
export interface MethodData {
  supported_methods: string;
  data?: {
    payment_processor_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Payment request details (for CartMandate)
 */
export interface PaymentRequestDetails {
  id: string;
  displayItems: DisplayItem[];
  shipping_options?: unknown;
  modifiers?: unknown;
  total: Total;
}

/**
 * Payment request options
 */
export interface PaymentRequestOptions {
  requestPayerName?: boolean;
  requestPayerEmail?: boolean;
  requestPayerPhone?: boolean;
  requestShipping?: boolean;
  shippingType?: string | null;
}

/**
 * Payment request structure (W3C Payment Request API based)
 */
export interface PaymentRequest {
  method_data: MethodData[];
  details: PaymentRequestDetails;
  options: PaymentRequestOptions;
}

/**
 * Cart Mandate Contents (Human-Present)
 * Cryptographically signed by merchant then user
 */
export interface CartMandateContents {
  id: string;
  user_signature_required: boolean;
  payment_request: PaymentRequest;
}

/**
 * Cart Mandate (Human-Present scenario)
 */
export interface CartMandate {
  contents: CartMandateContents;
  merchant_signature: string;
  timestamp: string;
}

/**
 * Shopping intent parameters for Intent Mandate
 */
export interface ShoppingIntent {
  prompt?: string; // Natural language prompt
  product_categories?: string[];
  specific_skus?: string[];
  budget_max?: Amount;
  merchant_preference?: string;
  refundable?: boolean;
  [key: string]: unknown; // Allow additional criteria
}

/**
 * Intent Mandate Contents (Human-Not-Present)
 * Pre-authorization for agent to act within constraints
 */
export interface IntentMandateContents {
  id: string;
  payer_id?: string;
  payee_id?: string;
  shopping_intent: ShoppingIntent;
  payment_methods?: string[]; // List or category of authorized payment methods
  prompt_playback?: string; // Agent's understanding of user's prompt
  ttl?: number; // Time-to-live in seconds
  timestamp: string;
}

/**
 * Intent Mandate (Human-Not-Present scenario)
 */
export interface IntentMandate {
  contents: IntentMandateContents;
  user_signature?: string;
  timestamp: string;
}

/**
 * Payment Response structure
 */
export interface PaymentResponse {
  requestId: string;
  methodName: string;
  details: {
    token?: string;
    [key: string]: unknown;
  };
  shippingAddress?: unknown;
  shippingOption?: unknown;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
}

export interface PaymentMandateAmount {
  currency: string;
  value: string;
}

export interface PaymentMandateTotal {
  label: string;
  amount: PaymentMandateAmount;
  refundPeriod?: number;
}

/**
 * Payment Mandate Contents
 * For visibility to payment networks about agent involvement
 */
export interface PaymentMandateContents {
  paymentMandateId: string;
  paymentDetailsId: string;
  paymentDetailsTotal: PaymentMandateTotal;
  paymentResponse: PaymentResponse;
  merchantAgent?: string;
  shoppingAgent?: string;
  humanPresent: boolean; // Human-Present vs Human-Not-Present signal
  timestamp: string;
}

/**
 * Payment Mandate
 */
export interface PaymentMandate {
  paymentMandateContents: PaymentMandateContents;
  userAuthorization: string; // JWT or similar cryptographic proof
}

/**
 * Schema cache entry
 */
export interface SchemaCache {
  schema: unknown;
  fetchedAt: Date;
  url: string;
}

/**
 * AP2 mandate types enum
 */
export enum MandateType {
  CART = "CartMandate",
  INTENT = "IntentMandate",
  PAYMENT = "PaymentMandate",
}

/**
 * Generic mandate for tools that work with any type
 */
export type AnyMandate = CartMandate | IntentMandate | PaymentMandate;
