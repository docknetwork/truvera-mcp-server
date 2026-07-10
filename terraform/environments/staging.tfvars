environment = "staging"
aws_region  = "us-west-1"

truvera_api_hostname   = "mcp-api-staging.truvera.io"
wallet_server_hostname = "mcp-wallet-staging.truvera.io"

# Fill in after: aws acm request-certificate ...
acm_certificate_arn = "arn:aws:acm:us-west-1:ACCOUNT_ID:certificate/REPLACE_ME"

# Fill in after: aws secretsmanager create-secret ...
wallet_secret_arn = "arn:aws:secretsmanager:us-west-1:ACCOUNT_ID:secret:staging/mcp/wallet-server-REPLACE_ME"

# Update these with the current build number on each deploy
truvera_api_image   = "docknetwork/truvera-api-mcp:latest"
wallet_server_image = "docknetwork/truvera-wallet-mcp:latest"

cheqd_network = "testnet"
