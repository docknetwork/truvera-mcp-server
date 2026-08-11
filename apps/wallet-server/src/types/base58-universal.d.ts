// base58-universal ships no .d.ts output.

declare module "base58-universal" {
  export function encode(bytes: Uint8Array): string;
  export function decode(value: string): Uint8Array;
}
