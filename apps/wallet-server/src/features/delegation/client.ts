import type { IWallet, IMessageProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";
import type { CreateDelegationOfferParams, CreateDelegationOfferResult, DelegationOffer } from "./types.js";

export class DelegationClient {
  private wallet: IWallet;
  private providerPromise: Promise<IMessageProvider> | null = null;

  constructor(wallet: IWallet) {
    this.wallet = wallet;
  }

  private ensureProvider(): Promise<IMessageProvider> {
    this.providerPromise ??= (async () => {
      const { createMessageProvider } = await import("@docknetwork/wallet-sdk-core/lib/message-provider.js");
      const { createDIDProvider } = await import("@docknetwork/wallet-sdk-core/lib/did-provider.js");
      const didProvider = createDIDProvider({ wallet: this.wallet });
      return createMessageProvider({ wallet: this.wallet, didProvider });
    })();
    return this.providerPromise;
  }

  private async resolveIssuerDID(requestedDID?: string): Promise<string> {
    const { createDIDProvider } = await import("@docknetwork/wallet-sdk-core/lib/did-provider.js");
    const didProvider = createDIDProvider({ wallet: this.wallet });
    const allDocs = await didProvider.getAll();
    const ownedDIDs: string[] = allDocs
      .filter((doc: any) => doc.type === "DIDResolutionResponse" && doc.didDocument?.id)
      .map((doc: any) => doc.didDocument.id.trim());

    if (ownedDIDs.length === 0) throw new Error("No DIDs found in wallet. Create a DID first.");

    if (!requestedDID) return ownedDIDs[0];

    if (!ownedDIDs.includes(requestedDID)) {
      throw new Error(`DID ${requestedDID} is not owned by this wallet. Use list_dids to see available DIDs.`);
    }
    return requestedDID;
  }

  async createDelegationOffer(params: CreateDelegationOfferParams): Promise<CreateDelegationOfferResult> {
    const { createDelegationOffer, createOOBInvitation } = await import(
      "@docknetwork/wallet-sdk-core/lib/delegation/delegation-offer.js"
    );

    const issuerDID = await this.resolveIssuerDID(params.issuerDID);

    const offer = await createDelegationOffer({
      wallet: this.wallet,
      issuerDID,
      delegationPolicy: params.delegationPolicy,
      delegationRole: params.delegationRole,
      credentialId: params.credentialId,
      expiresInMs: params.expiresInMs,
    });

    const oobUrl = createOOBInvitation(issuerDID, offer, {
      goal: "Delegation offer",
    });

    return { offer: offer as DelegationOffer, oobUrl };
  }

  async acceptDelegationOffer(offerId: string): Promise<void> {
    const { acceptDelegationOffer } = await import(
      "@docknetwork/wallet-sdk-core/lib/delegation/delegation-offer.js"
    );
    const messageProvider = await this.ensureProvider();

    const storedOffer = await this.wallet.getDocumentById(offerId);
    if (!storedOffer) throw new Error(`No delegation offer found with id: ${offerId}`);

    await acceptDelegationOffer({
      delegationOffer: storedOffer as DelegationOffer,
      wallet: this.wallet,
      messageProvider,
    });
  }

  async handleDelegationMessage(message: string | Record<string, unknown>): Promise<{ handled: boolean; type?: string }> {
    const { handleMessage, decodeMessage } = await import(
      "@docknetwork/wallet-sdk-core/lib/delegation/delegation-offer.js"
    );
    const messageProvider = await this.ensureProvider();

    const decoded = decodeMessage(message);
    if (!decoded) return { handled: false };

    await handleMessage(message, { wallet: this.wallet, messageProvider });
    return { handled: true, type: decoded.type };
  }

  async listDelegationOffers(): Promise<DelegationOffer[]> {
    const docs = await this.wallet.getDocumentsByType("DelegationOffer");
    return docs as DelegationOffer[];
  }

  async getDelegationDetails(credentialId: string): Promise<Record<string, unknown>> {
    const { getDelegationDetails } = await import(
      "@docknetwork/wallet-sdk-core/lib/delegation/delegation-policy.js"
    );
    const credential = await this.wallet.getDocumentById(credentialId);
    if (!credential) throw new Error(`Credential not found: ${credentialId}`);

    return getDelegationDetails(credential, this.wallet) as Promise<Record<string, unknown>>;
  }
}
