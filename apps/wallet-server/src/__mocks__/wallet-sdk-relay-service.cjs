// Stub for @docknetwork/wallet-sdk-relay-service/lib which is not installed.
// Integration tests that exercise messaging inject their own relay stub via
// createMessageProvider({ relayService: stub }), so these methods are never called.
'use strict';

module.exports = {
  RelayService: {
    sendMessage: async () => ({}),
    ackMessages: async () => undefined,
    resolveDidcommMessage: async () => ({}),
    signJwt: async () => '',
    getMessages: async () => [],
    registerDIDPushNotification: async () => undefined,
  },
};
