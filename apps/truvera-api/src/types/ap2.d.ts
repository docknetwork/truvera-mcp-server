// @docknetwork/ap2 is authored in plain JS (no .d.ts output). Minimal shim
// for the surface this app actually uses (verification + receipt building).

declare module "@docknetwork/ap2" {
  export function verifyClosedCheckoutMandate(
    presentation: string,
    options?: {
      publicKey?: unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- external untyped module boundary
      holderJwk?: any;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- external untyped module boundary
      holderJwk?: any;
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

  export function buildPaymentReceipt(receipt: Record<string, unknown>): Record<string, unknown>;
  export function computeMandateReference(presentation: string): string;

  export interface MandateSigner {
    sign(data: Uint8Array): Uint8Array | Promise<Uint8Array>;
  }

  export function buildOpenPaymentMandate(content: Record<string, unknown>): Record<string, unknown>;
  export function buildClosedPaymentMandate(content: Record<string, unknown>): Record<string, unknown>;
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
  export function computeCheckoutHash(checkoutJwt: string, sdAlg?: string): string;
}

declare module "@docknetwork/crypto-utils/keypairs" {
  export class Secp256r1Keypair {
    static random(): Secp256r1Keypair;
    publicKey(): unknown;
    sign(message: Uint8Array): { bytes: Uint8Array };
  }
}

declare module "@docknetwork/crypto-utils/vc" {
  export function secp256r1PublicKeyToJwk(publicKey: unknown): {
    kty: string;
    crv: string;
    x: string;
    y: string;
  };
}
