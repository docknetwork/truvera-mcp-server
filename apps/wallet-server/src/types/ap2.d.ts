// @docknetwork/ap2 and @docknetwork/crypto-utils are authored in plain JS
// (no .d.ts output); base58-universal ships none either. Minimal shims for
// the surface this app actually uses.

declare module "base58-universal" {
  export function encode(bytes: Uint8Array): string;
  export function decode(value: string): Uint8Array;
}

declare module "@docknetwork/crypto-utils/keypairs" {
  export class Secp256r1Keypair {
    static random(): Secp256r1Keypair;
    publicKey(): { value: { bytes: Uint8Array } };
    sign(message: Uint8Array): { bytes: Uint8Array };
  }
}

declare module "@docknetwork/crypto-utils/vc" {
  export function secp256r1PublicKeyToJwk(publicKey: Uint8Array): {
    kty: string;
    crv: string;
    x: string;
    y: string;
  };
  export function jwkToSecp256r1PublicKey(jwk: {
    kty: string;
    crv: string;
    x: string;
    y: string;
  }): Uint8Array;
}

declare module "@docknetwork/ap2" {
  export interface MandateSigner {
    sign(data: Uint8Array): Uint8Array | Promise<Uint8Array>;
  }

  export function buildOpenCheckoutMandate(content: Record<string, unknown>): Record<string, unknown>;
  export function buildClosedCheckoutMandate(content: Record<string, unknown>): Record<string, unknown>;
  export function buildOpenPaymentMandate(content: Record<string, unknown>): Record<string, unknown>;
  export function buildClosedPaymentMandate(content: Record<string, unknown>): Record<string, unknown>;

  export function signOpenCheckoutMandate(
    content: Record<string, unknown>,
    options: { signer: MandateSigner; kid?: string; sdAlg?: string }
  ): Promise<string>;
  export function signClosedCheckoutMandate(
    content: Record<string, unknown>,
    options: {
      signer: MandateSigner;
      kid?: string;
      nonce: string;
      openMandatePresentation: string;
      sdAlg?: string;
    }
  ): Promise<string>;
  export function signOpenPaymentMandate(
    content: Record<string, unknown>,
    options: { signer: MandateSigner; kid?: string; sdAlg?: string }
  ): Promise<string>;
  export function signClosedPaymentMandate(
    content: Record<string, unknown>,
    options: {
      signer: MandateSigner;
      kid?: string;
      nonce: string;
      openMandatePresentation: string;
      sdAlg?: string;
    }
  ): Promise<string>;

  export function verifyClosedCheckoutMandate(
    presentation: string,
    options?: {
      publicKey?: unknown;
      holderJwk?: Record<string, unknown>;
      openMandatePresentation?: string;
      currentDate?: Date;
      clockTolerance?: number;
    }
  ): {
    verified: boolean;
    content?: Record<string, unknown>;
    checkoutJwt?: string;
    protectedHeader?: Record<string, unknown>;
    sdHashVerified?: boolean;
    error?: Error;
  };
  export function verifyClosedPaymentMandate(
    presentation: string,
    options?: {
      publicKey?: unknown;
      holderJwk?: Record<string, unknown>;
      checkoutJwt?: string;
      openMandatePresentation?: string;
      currentDate?: Date;
      clockTolerance?: number;
    }
  ): {
    verified: boolean;
    content?: Record<string, unknown>;
    protectedHeader?: Record<string, unknown>;
    transactionIdVerified?: boolean;
    sdHashVerified?: boolean;
    error?: Error;
  };

  export function computeCheckoutHash(checkoutJwt: string, sdAlg?: string): string;
  export function computeDisclosureDigest(encodedDisclosure: string, sdAlg?: string): string;

  export function resolveOpenPaymentMandateContent(
    presentation: string,
    options?: { currentDate?: Date; clockTolerance?: number }
  ): {
    content: Record<string, unknown> & {
      constraints: Array<{ type: string; [key: string]: unknown }>;
      cnf: { jwk: Record<string, unknown> };
    };
    protectedHeader: Record<string, unknown>;
  };
}
