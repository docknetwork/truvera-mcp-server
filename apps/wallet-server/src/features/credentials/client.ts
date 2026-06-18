/**
 * Credential Client
 * Manages credential operations using the Dock Wallet SDK
 */

import type { IWallet, ICredentialProvider, IDIDProvider } from "@docknetwork/wallet-sdk-core/lib/types.js";
import { createVerificationController } from "@docknetwork/wallet-sdk-core/lib/verification-controller.js";
import type {
  CredentialListResult,
  CredentialInfo,
  GetCredentialResult,
  ImportCredentialResult,
  ProofResponseCandidate,
  PresentedCredentialDetail,
  RespondToProofRequestParams,
  RespondToProofRequestResult,
  SharedPresentationDetails,
} from "./types.js";

export class CredentialClient {
  private wallet: IWallet;
  private credentialProviderPromise: Promise<ICredentialProvider> | null = null;
  private didProviderPromise: Promise<IDIDProvider> | null = null;

  constructor(wallet: IWallet, didProvider?: IDIDProvider) {
    this.wallet = wallet;
    if (didProvider) {
      this.didProviderPromise = Promise.resolve(didProvider);
    }
  }

  private getCredentialId(credential: any): string | undefined {
    const id = credential?.id || credential?.credential?.id;
    return typeof id === "string" ? id : undefined;
  }

  private getCredentialAttributeKeys(credential: any): string[] {
    const subject = credential?.credentialSubject || credential?.credential?.credentialSubject;
    if (!subject || typeof subject !== "object") {
      return [];
    }
    // Return full JSON paths so that availableAttributes in needs_input responses can
    // be passed directly back in attributesToRevealByCredential without modification.
    return Object.keys(subject)
      .filter((key) => key !== "id")
      .map((key) => `credentialSubject.${key}`);
  }

  private normalizeAttributesToReveal(attributes: string[] | undefined, credential: any): string[] | undefined {
    if (!attributes) return undefined;
    const subject = credential?.credentialSubject || credential?.credential?.credentialSubject;
    const subjectKeys = subject && typeof subject === "object" ? new Set(Object.keys(subject)) : new Set<string>();
    // Promote bare attribute names (no path separator) that match a credentialSubject key to
    // their full path form. Any path that already contains "." is left as-is, covering both
    // credentialSubject.X paths supplied explicitly and non-credentialSubject paths like "issuer".
    return attributes.map((attr) =>
      !attr.includes(".") && subjectKeys.has(attr) ? `credentialSubject.${attr}` : attr
    );
  }

  private getResponseUrlFromProofRequest(proofRequest: Record<string, unknown>): string | undefined {
    const direct = proofRequest.response_url;
    if (typeof direct === "string") {
      return direct;
    }

    const nestedRequest = (proofRequest as any)?.request?.response_url;
    if (typeof nestedRequest === "string") {
      return nestedRequest;
    }

    return undefined;
  }

  private summarizePresentation(presentation: any): SharedPresentationDetails {
    const credentials = presentation?.verifiableCredential;
    const credentialList = Array.isArray(credentials) ? credentials : credentials ? [credentials] : [];

    const summarizedCredentials: PresentedCredentialDetail[] = credentialList.map((credential: any) => ({
      id: credential?.id,
      type: Array.isArray(credential?.type) ? credential.type : undefined,
      issuer: typeof credential?.issuer === "string" ? credential.issuer : undefined,
      credentialSubject:
        credential?.credentialSubject && typeof credential.credentialSubject === "object"
          ? credential.credentialSubject
          : undefined,
    }));

    return {
      holder: typeof presentation?.holder === "string" ? presentation.holder : undefined,
      proofType: typeof presentation?.proof?.type === "string" ? presentation.proof.type : undefined,
      credentialCount: summarizedCredentials.length,
      credentials: summarizedCredentials,
    };
  }

  /**
   * Initialize the credential provider
   */
  private ensureProvider(): Promise<ICredentialProvider> {
    this.credentialProviderPromise ??= import("@docknetwork/wallet-sdk-core/lib/credential-provider.js").then(
      ({ createCredentialProvider }) => createCredentialProvider({ wallet: this.wallet })
    );
    return this.credentialProviderPromise;
  }

  private ensureDIDProvider(): Promise<IDIDProvider> {
    this.didProviderPromise ??= import("@docknetwork/wallet-sdk-core/lib/did-provider.js").then(
      ({ createDIDProvider }) => createDIDProvider({ wallet: this.wallet })
    );
    return this.didProviderPromise;
  }

  /**
   * Retrieve a single credential by its ID
   */
  async getCredential(id: string): Promise<GetCredentialResult> {
    try {
      const provider = await this.ensureProvider();
      // getById is typed as synchronous but the underlying dataStore call is async
      const doc = await (provider.getById(id) as Promise<any> | any);
      if (!doc) {
        return { success: false, message: `Credential not found: ${id}` };
      }
      const credential: CredentialInfo = {
        id: doc.id || doc.credential?.id || id,
        type: doc.type || doc.credential?.type || ["VerifiableCredential"],
        issuer: doc.issuer || doc.credential?.issuer || "unknown",
        issuanceDate: doc.issuanceDate || doc.credential?.issuanceDate || "",
        expirationDate: doc.expirationDate || doc.credential?.expirationDate,
        credentialSubject: doc.credentialSubject || doc.credential?.credentialSubject,
        ...doc,
      };
      return { success: true, credential };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Import a credential from an OpenID credential offer URI
   */
  async importCredential(uri: string): Promise<ImportCredentialResult> {
    try {
      const credentialProvider = await this.ensureProvider();
      const didProvider = await this.ensureDIDProvider();

      const before = await credentialProvider.getCredentials();
      const beforeIds = new Set(before.map((doc: any) => doc?.id).filter(Boolean));

      await credentialProvider.importCredentialFromURI({
        uri,
        didProvider,
      });

      const after = await credentialProvider.getCredentials();
      const imported =
        after.find((doc: any) => doc?.id && !beforeIds.has(doc.id)) ??
        after[after.length - 1];

      if (!imported) {
        return {
          success: true,
          message: "Credential import completed, but no credential was returned by the SDK.",
        };
      }

      const credential: CredentialInfo = {
        id: imported?.id || imported?.credential?.id || "unknown",
        type: imported?.type || imported?.credential?.type || ["VerifiableCredential"],
        issuer: imported?.issuer || imported?.credential?.issuer || "unknown",
        issuanceDate: imported?.issuanceDate || imported?.credential?.issuanceDate || new Date().toISOString(),
        expirationDate: imported?.expirationDate || imported?.credential?.expirationDate,
        credentialSubject: imported?.credentialSubject || imported?.credential?.credentialSubject || {},
      };

      if (imported && typeof imported === "object") {
        Object.assign(credential, imported);
      }

      return {
        success: true,
        credential,
        message: "Credential successfully imported",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all credentials in the wallet
   */
  async listCredentials(): Promise<CredentialListResult> {
    const provider = await this.ensureProvider();
    const allDocs = await provider.getCredentials();
    
    // Map credentials to our standardized format
    const credentials: CredentialInfo[] = allDocs.map((doc: any) => ({
      id: doc.id || doc.credential?.id,
      type: doc.type || doc.credential?.type || [],
      issuer: doc.issuer || doc.credential?.issuer || "unknown",
      issuanceDate: doc.issuanceDate || doc.credential?.issuanceDate || "",
      expirationDate: doc.expirationDate || doc.credential?.expirationDate,
      credentialSubject: doc.credentialSubject || doc.credential?.credentialSubject,
      ...doc,
    }));
    
    return {
      credentials,
      count: credentials.length,
    };
  }

  /**
   * Build a verifiable presentation that satisfies a proof request using
   * credentials already stored in the wallet.
   */
  async respondToProofRequest(params: RespondToProofRequestParams): Promise<RespondToProofRequestResult> {
    try {
      const { proofRequest, selectedCredentialIds, attributesToRevealByCredential } = params;
      const interactive = params.interactive !== false;
      const autoSubmit = params.autoSubmit !== false;

      const credentialProvider = await this.ensureProvider();
      const didProvider = await this.ensureDIDProvider();
      const controller = createVerificationController({
        wallet: this.wallet,
        credentialProvider,
        didProvider,
      });

      await controller.start({ template: proofRequest });

      const filteredCredentials = controller.getFilteredCredentials();
      if (!Array.isArray(filteredCredentials) || filteredCredentials.length === 0) {
        return {
          success: false,
          status: "failed",
          message: "No credentials in the wallet matched the proof request.",
        };
      }

      const candidateCredentials: ProofResponseCandidate[] = [];
      const credentialById = new Map<string, any>();
      const candidateById = new Map<string, ProofResponseCandidate>();

      for (const credential of filteredCredentials) {
        const credentialId = this.getCredentialId(credential);
        if (!credentialId) {
          continue;
        }

        const supportsSelectiveDisclosure =
          !!credential?._sd_jwt || !!(await controller.isBBSPlusCredential(credential));
        const availableAttributes = this.getCredentialAttributeKeys(credential);

        const candidate: ProofResponseCandidate = {
          credentialId,
          type: Array.isArray(credential?.type)
            ? credential.type
            : Array.isArray(credential?.credential?.type)
              ? credential.credential.type
              : [],
          issuer:
            typeof credential?.issuer === "string"
              ? credential.issuer
              : typeof credential?.credential?.issuer === "string"
                ? credential.credential.issuer
                : undefined,
          issuanceDate:
            typeof credential?.issuanceDate === "string"
              ? credential.issuanceDate
              : typeof credential?.credential?.issuanceDate === "string"
                ? credential.credential.issuanceDate
                : undefined,
          availableAttributes,
          supportsSelectiveDisclosure,
        };
        candidateCredentials.push(candidate);
        credentialById.set(credentialId, credential);
        candidateById.set(credentialId, candidate);
      }

      if (candidateCredentials.length === 0) {
        return {
          success: false,
          status: "failed",
          message: "Matched credentials were missing stable identifiers required for presentation creation.",
        };
      }

      const requiredDecisions: string[] = [];
      let resolvedCredentialIds: string[] = [];

      if (selectedCredentialIds && selectedCredentialIds.length > 0) {
        const invalidIds = selectedCredentialIds.filter((id) => !credentialById.has(id));
        if (invalidIds.length > 0) {
          return {
            success: false,
            status: "failed",
            message: `selectedCredentialIds contained values that do not match this proof request: ${invalidIds.join(", ")}`,
            candidateCredentials,
          };
        }
        resolvedCredentialIds = selectedCredentialIds;
      } else if (candidateCredentials.length === 1) {
        resolvedCredentialIds = [candidateCredentials[0].credentialId];
      } else if (interactive) {
        requiredDecisions.push("Select one or more credentials using selectedCredentialIds.");
      } else {
        resolvedCredentialIds = candidateCredentials.map((candidate) => candidate.credentialId);
      }

      const needsAttributeDecision =
        interactive &&
        resolvedCredentialIds.length > 0 &&
        !attributesToRevealByCredential &&
        resolvedCredentialIds.some((id) => {
          const candidate = candidateById.get(id);
          return !!candidate && candidate.supportsSelectiveDisclosure && candidate.availableAttributes.length > 0;
        });

      if (needsAttributeDecision) {
        requiredDecisions.push(
          "Provide attributesToRevealByCredential for selective-disclosure credentials, or call with interactive=false to proceed automatically."
        );
      }

      if (requiredDecisions.length > 0) {
        return {
          success: true,
          status: "needs_input",
          message: "Additional user input is required before a presentation can be created.",
          candidateCredentials,
          requiredDecisions,
        };
      }

      for (const credentialId of resolvedCredentialIds) {
        const credential = credentialById.get(credentialId);
        if (!credential) {
          continue;
        }

        controller.selectedCredentials.set(credentialId, {
          credential,
          attributesToReveal: this.normalizeAttributesToReveal(
            attributesToRevealByCredential?.[credentialId],
            credential
          ),
        });
      }

      const presentation = await controller.createPresentation();
      if (!presentation) {
        return { success: false, status: "failed", message: "createPresentation returned no presentation." };
      }
      const evaluation = controller.evaluatePresentation(presentation);
      const sharedPresentationDetails = this.summarizePresentation(presentation);

      if (!evaluation.isValid) {
        return {
          success: false,
          status: "failed",
          message: "Generated presentation did not satisfy the proof request.",
          presentation,
          selectedCredentialIds: resolvedCredentialIds,
          selectedDID: controller.getSelectedDID(),
          sharedPresentationDetails,
          errors: evaluation.errors,
          warnings: evaluation.warnings,
        };
      }

      const responseUrl = this.getResponseUrlFromProofRequest(proofRequest);
      let submission: RespondToProofRequestResult["submission"] = {
        submitted: false,
        responseUrl,
      };

      if (autoSubmit) {
        if (!responseUrl) {
          return {
            success: false,
            status: "failed",
            message: "proofRequest.response_url is required to auto-submit the presentation.",
            presentation,
            selectedCredentialIds: resolvedCredentialIds,
            selectedDID: controller.getSelectedDID(),
            sharedPresentationDetails,
          };
        }

        const verifierResponse = await controller.submitPresentation(presentation);
        submission = {
          submitted: true,
          responseUrl,
          verifierResponse,
        };
      }

      return {
        success: true,
        status: "completed",
        presentation,
        selectedCredentialIds: resolvedCredentialIds,
        selectedDID: controller.getSelectedDID(),
        submission,
        sharedPresentationDetails,
        warnings: evaluation.warnings,
        message: autoSubmit ? "Presentation created and submitted successfully" : "Presentation created successfully",
      };
    } catch (error) {
      return {
        success: false,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
