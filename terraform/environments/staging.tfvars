environment = "staging"
aws_region  = "us-west-1"

truvera_api_hostname   = "mcp-api-staging.truvera.io"
wallet_server_hostname = "mcp-wallet-staging.truvera.io"

# Fill in after: aws acm request-certificate ...
acm_certificate_arn = "arn:aws:acm:us-west-1:252098842926:certificate/441c2984-edb9-45b1-9ad5-703ee866f159"

# Fill in after: aws secretsmanager create-secret ...
wallet_secret_arn = "arn:aws:secretsmanager:us-west-1:252098842926:secret:prod/mcp/wallet-server-wNzqdL"

# Update these with the current build number on each deploy
truvera_api_image   = "docknetwork/truvera-api-mcp:latest"
wallet_server_image = "docknetwork/truvera-wallet-mcp:1"

cheqd_network = "testnet"
