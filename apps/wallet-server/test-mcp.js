import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function run() {
  const transport = new SSEClientTransport(new URL("http://localhost:3001/sse"));
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  
  try {
    console.log("Connecting to MCP server at http://localhost:3001/sse...");
    await client.connect(transport);
    console.log("Connected to MCP server");

    console.log("Listing credentials...");
    const credentialsResponse = await client.callTool({
      name: "list_credentials",
      arguments: {}
    });
    
    console.log("Credentials response received.");

    let bbsId = null;
    for (const item of credentialsResponse.content) {
      if (item.text) {
        try {
          const parsed = JSON.parse(item.text);
          const credentials = Array.isArray(parsed) ? parsed : [parsed];
          const found = credentials.find(c => 
            (c.proof && c.proof.type === "Bls12381BBSSignatureDock2023") ||
            (c.proof && Array.isArray(c.proof) && c.proof.some(p => p.type === "Bls12381BBSSignatureDock2023"))
          );
          if (found) {
            bbsId = found.id;
            break;
          }
        } catch (e) {
          // If item.text is not JSON, check if it contains the string
          if (item.text.includes("Bls12381BBSSignatureDock2023")) {
             // Try to extract id with regex
             const match = item.text.match(/"id":\s*"([^"]+)"/);
             if (match) bbsId = match[1];
          }
        }
      }
    }
    
    if (!bbsId) {
      console.log("No BBS credential found in response. Using a dummy ID for testing respond_to_proof_request.");
      bbsId = "urn:uuid:dummy-bbs-id";
    }

    console.log("Using BBS Credential ID:", bbsId);

    const proofRequest = {
      type: "VerifiablePresentation",
      verifiableCredential: [
        {
          id: "https://schema.truvera.io/ProofOfEmployment-V1-1773770846816.json",
          type: ["VerifiableCredential", "ProofOfEmployment"]
        }
      ]
    };

    console.log("Calling respond_to_proof_request...");
    const respondResponse = await client.callTool({
      name: "respond_to_proof_request",
      arguments: {
        proofRequest: proofRequest,
        selectedCredentialIds: [bbsId],
        attributesToRevealByCredential: {
          [bbsId]: ["name", "jobTitle", "employer", "dateOfBirth"]
        },
        interactive: false,
        autoSubmit: false
      }
    });

    console.log("Tool Response JSON:");
    console.log(JSON.stringify(respondResponse, null, 2));
    
    const responseText = JSON.stringify(respondResponse);
    const errorWithGetItem = responseText.includes("getItem");
    console.log("Errors with getItem:", errorWithGetItem);

  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    process.exit(0);
  }
}

run();
