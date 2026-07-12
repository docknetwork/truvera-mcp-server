# Connecting Claude Desktop to Truvera

**What this gives you:** Claude Desktop can issue credentials, check DIDs, verify proofs,
manage a wallet, and more — just by asking in plain English. No API calls, no code.

There are two servers you can connect:

| Server | What it does | How you get access |
|---|---|---|
| **Truvera API** | Verifiable credentials, DIDs, proof requests, schemas, profiles | Self-serve — sign up at truvera.io for your own API key |
| **Wallet** | Hold credentials, DIDComm messaging, respond to proof requests | Admin-issued — ask an admin for your personal wallet token (not self-serve) |

You can set up either one on its own, or both together.

**Before you start, you'll need:**
1. Claude Desktop installed
2. Node.js installed ([nodejs.org](https://nodejs.org) — pick the LTS version, click through the installer)
3. Depending on which server(s) you're connecting:
   - Truvera API: a free API key — sign up at **truvera.io** and copy your key from your account dashboard
   - Wallet: a personal wallet token — ask an admin to mint one for you (see [wallet-server README](../apps/wallet-server/README.md#mint-a-jwt-for-a-new-tenant))

## Add the server(s) (5 minutes)

**Step 1: Open your Claude Desktop config file**

| Your OS | File location |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

*Tip: if the file doesn't exist yet, just create it with this content.*

**Step 2: Paste this in** (replace `YOUR_API_KEY_HERE` and/or `YOUR_WALLET_TOKEN_HERE` —
skip whichever server you're not using and delete its block):

```json
{
  "mcpServers": {
    "truvera-api": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp-api-staging.truvera.io/mcp",
        "--header", "Authorization: Bearer YOUR_API_KEY_HERE"
      ]
    },
    "truvera-wallet": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp-wallet-staging.truvera.io/mcp",
        "--header", "Authorization: Bearer YOUR_WALLET_TOKEN_HERE"
      ]
    }
  }
}
```

**Step 3: Save the file and fully restart Claude Desktop** (quit, don't just close the window)

**Step 4: Try it** — ask Claude: *"What Truvera tools do you have available?"*
If it lists things like issuing credentials, checking DIDs, or managing your wallet, you're
connected. 🎉

*No manual install needed — `npx -y` automatically downloads `mcp-remote` the first time it
runs. Node.js is the only thing you must install yourself.*

*Heads up: this manual config-file step is a short-term solution. We're working on proper
login-based auth (no pasting API keys) so this will get simpler soon.*
