/**
 * Message Client
 * Manages DIDComm messaging using the Dock Wallet SDK
 */

import type { IWallet, IDIDProvider, IMessageProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";
import type {
  FetchMessagesResult,
  ProcessedMessage,
  SendMessageParams,
  SendMessageResult,
} from "./types.js";

// Simple type → suggested action for messages that don't need goal_code discrimination
const MESSAGE_ACTIONS: Record<string, string> = {
  "https://didcomm.org/present-proof/1.0/request-presentation":
    "Call respond_to_proof_request with the proofRequest from body.proofRequest to create and submit a verifiable presentation.",
  "https://didcomm.org/issue-credential/2.0/offer-credential":
    "Call import_credential with the credential offer URI from body to store the credential in the wallet.",
};

// goal_code → type → suggested action for messages that share a type but differ by goal
const GOAL_CODE_ACTIONS: Record<string, Record<string, string>> = {
  "dock.offer-delegation": {
    "https://didcomm.org/issue-credential/3.0/request-credential":
      "A delegatee has accepted your delegation offer. Call handle_delegation_message with this message to issue the delegated credential.",
    "https://didcomm.org/issue-credential/3.0/issue-credential":
      "A delegated credential has been issued to you. Call handle_delegation_message with this message to store it in the wallet.",
    "https://didcomm.org/issue-credential/3.0/ack":
      "The delegatee has acknowledged receipt of the delegated credential. Call handle_delegation_message with this message to finalise the offer.",
  },
};

export class MessageClient {
  private wallet: IWallet;
  private didProvider: IDIDProvider | null = null;
  private providerPromise: Promise<IMessageProvider> | null = null;

  constructor(wallet: IWallet, didProvider?: IDIDProvider) {
    this.wallet = wallet;
    this.didProvider = didProvider ?? null;
  }

  private async ensureDIDProvider(): Promise<IDIDProvider> {
    if (!this.didProvider) {
      const { createDIDProvider } = await import("@docknetwork/wallet-sdk-core/lib/did-provider.js");
      this.didProvider = createDIDProvider({ wallet: this.wallet });
    }
    return this.didProvider;
  }

  private ensureProvider(): Promise<IMessageProvider> {
    this.providerPromise ??= (async () => {
      const didProvider = await this.ensureDIDProvider();
      const { createMessageProvider } = await import("@docknetwork/wallet-sdk-core/lib/message-provider.js");
      return createMessageProvider({ wallet: this.wallet, didProvider });
    })();
    return this.providerPromise;
  }

  private classifyMessage(decryptedMessage: any): ProcessedMessage {
    const id: string | undefined = decryptedMessage?.id;
    const type: string | undefined = decryptedMessage?.type;
    const from: string | undefined = decryptedMessage?.from;
    const to: string | undefined = decryptedMessage?.to;
    const body: Record<string, unknown> | undefined = decryptedMessage?.body ?? undefined;

    const goalCode = typeof body?.goal_code === "string" ? body.goal_code : undefined;
    const suggestedAction: string | undefined =
      (goalCode && type && GOAL_CODE_ACTIONS[goalCode]?.[type]) ||
      (type && MESSAGE_ACTIONS[type]) ||
      undefined;

    return { id, type, from, to, body, suggestedAction };
  }

  /**
   * Fetch messages from the relay service, decrypt them, and return them.
   * Messages are marked as read (removed from wallet storage) after processing.
   */
  async fetchMessages(): Promise<FetchMessagesResult> {
    try {
      const provider = await this.ensureProvider();

      // Collect decrypted messages via listener before calling processDIDCommMessages
      const decryptedMessages: any[] = [];
      const removeListener = provider.addMessageListener((msg: any) => {
        decryptedMessages.push(msg);
      });

      try {
        await provider.fetchMessages();
        // Process all pending messages (high limit to drain the queue)
        await provider.processDIDCommMessages();
      } finally {
        removeListener?.();
      }

      const messages: ProcessedMessage[] = decryptedMessages.map((msg) => this.classifyMessage(msg));

      return {
        success: true,
        messages,
        decryptedCount: decryptedMessages.length,
        processedCount: messages.length,
        message:
          messages.length === 0
            ? "No new messages"
            : `Received ${messages.length} message${messages.length === 1 ? "" : "s"}`,
      };
    } catch (error) {
      return {
        success: false,
        messages: [],
        decryptedCount: 0,
        processedCount: 0,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a DIDComm message to a recipient DID.
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      const provider = await this.ensureProvider();

      let from = params.from;
      if (!from) {
        // Default to wallet's first available DID
        const didProvider = await this.ensureDIDProvider();
        const allDocs: any[] = await didProvider.getAll();
        const defaultDIDDoc = allDocs.find(
          (doc: any) => doc.type === "DIDResolutionResponse" && doc.didDocument?.id
        );
        from = defaultDIDDoc?.didDocument?.id?.trim();
      }

      if (!from) {
        return { success: false, message: "No default DID available — create a DID first" };
      }

      await provider.sendMessage({
        from,
        to: params.to,
        message: params.message,
        ...(params.type ? { type: params.type } : {}),
      });

      return { success: true, message: "Message sent" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Stop any background timers started by the message provider.
   * Should be called during wallet cleanup.
   */
  async stop(): Promise<void> {
    if (this.providerPromise) {
      const provider = await this.providerPromise;
      provider.stop();
    }
  }
}
