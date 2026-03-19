import { describe, expect, it, vi } from "vitest";
import { AP2Client } from "../../client.js";

describe("AP2Client Payment Mandate issuance", () => {
  it("builds a schema-compatible direct issuance payload", async () => {
    const requestSpy = vi.fn().mockResolvedValue({
      success: true,
      data: { id: "cred-123" },
    });
    const truveraClient = { request: requestSpy } as any;
    const openIdClient = {
      createIssuer: vi.fn(),
      createCredentialOffer: vi.fn(),
    } as any;

    const client = new AP2Client(truveraClient, openIdClient);

    await client.issuePaymentMandate({
      payment_mandate_id: "pm_123",
      payment_details_id: "order_123",
      total_currency: "USD",
      total_value: 299.99,
      payment_method: "CARD",
      merchant_agent: "MerchantBot",
      shopping_agent: "ShopperBot",
      human_present: true,
      refund_period_days: 30,
      user_authorization: "jwt-token",
      issuer_did: "did:cheqd:testnet:issuer",
      subject_did: "did:key:z6Mkh123",
    });

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const call = requestSpy.mock.calls[0][0];
    expect(call.endpoint).toBe("/credentials");
    expect(call.body.distribute).toBe(true);
    expect(call.body.credential.credentialSubject.id).toBe("did:key:z6Mkh123");
    expect(call.body.credential.credentialSubject.paymentMandateContents.paymentMandateId).toBe("pm_123");
    expect(call.body.credential.credentialSubject.paymentMandateContents.paymentDetailsId).toBe("order_123");
    expect(call.body.credential.credentialSubject.paymentMandateContents.paymentDetailsTotal.amount.value).toBe("299.99");
    expect(call.body.credential.credentialSubject.paymentMandateContents.paymentResponse.requestId).toBe("order_123");
    expect(call.body.credential.credentialSubject.paymentMandateContents.paymentResponse.methodName).toBe("CARD");
    expect(call.body.credential.credentialSubject.paymentMandateContents.humanPresent).toBe(true);
    expect(call.body.credential.credentialSubject.userAuthorization).toBe("jwt-token");
  });

  it("builds a schema-compatible offer subject with fallback userAuthorization", async () => {
    const truveraClient = { request: vi.fn() } as any;
    const createIssuer = vi.fn().mockResolvedValue({
      success: true,
      data: { id: "issuer-123" },
    });
    const createCredentialOffer = vi.fn().mockResolvedValue({
      success: true,
      data: { url: "openid-credential-offer://test" },
    });
    const openIdClient = {
      createIssuer,
      createCredentialOffer,
    } as any;

    const client = new AP2Client(truveraClient, openIdClient);

    await client.issuePaymentMandate({
      payment_mandate_id: "pm_offer_123",
      payment_details_id: "order_offer_123",
      total_currency: "USD",
      total_value: 49.99,
      payment_method: "CARD",
      human_present: false,
      issuer_did: "did:cheqd:testnet:issuer",
    });

    expect(createIssuer).toHaveBeenCalledTimes(1);
    const issuerPayload = createIssuer.mock.calls[0][0];
    expect(issuerPayload.credentialOptions.credential.subject.id).toBe("{{holder_did}}");
    expect(issuerPayload.credentialOptions.credential.subject.paymentMandateContents.paymentMandateId).toBe("pm_offer_123");
    expect(issuerPayload.credentialOptions.credential.subject.paymentMandateContents.paymentResponse.requestId).toBe("order_offer_123");
    expect(issuerPayload.credentialOptions.credential.subject.paymentMandateContents.humanPresent).toBe(false);
    expect(issuerPayload.credentialOptions.credential.subject.userAuthorization).toBe("pending-user-authorization");
  });
});