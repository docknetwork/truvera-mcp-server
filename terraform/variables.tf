variable "aws_region" {
  description = "AWS region to deploy into"
  default     = "us-west-1"
}

variable "environment" {
  description = "Deployment environment label (prod | staging | test)"
}

variable "vpc_id" {
  description = "VPC to deploy into"
}

variable "subnet_ids" {
  description = "Subnet IDs for ECS tasks, EFS mount targets, and ALB (one per AZ)"
  type        = list(string)
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS on the ALB (must cover both service hostnames)"
}

# ----- images ----------------------------------------------------------------

variable "truvera_api_image" {
  description = "Full Docker image reference for truvera-api MCP (e.g. docknetwork/truvera-api-mcp:123)"
}

variable "wallet_server_image" {
  description = "Full Docker image reference for wallet-server MCP (e.g. docknetwork/truvera-wallet-mcp:123)"
}

# ----- routing ---------------------------------------------------------------

variable "truvera_api_hostname" {
  description = "Public hostname for the truvera-api MCP service (e.g. mcp-api.truvera.io)"
}

variable "wallet_server_hostname" {
  description = "Public hostname for the wallet-server MCP service (e.g. mcp-wallet.truvera.io)"
}

# ----- secrets ---------------------------------------------------------------

# Create this secret manually before first apply, then reference its ARN here:
#
#   aws secretsmanager create-secret \
#     --name "${environment}/mcp/wallet-server" \
#     --secret-string '{
#       "MCP_JWT_PUBLIC_KEY": "<PEM from scripts/generate-keypair.js>",
#       "WALLET_MASTER_KEY":  "<32+ byte random hex>"
#     }'
#
# WALLET_MASTER_KEY is the HMAC root key for all tenant wallet derivation.
# Rotating it invalidates every existing wallet. Treat it like a master password.
variable "wallet_secret_arn" {
  description = "ARN of the Secrets Manager secret containing MCP_JWT_PUBLIC_KEY and WALLET_MASTER_KEY"
}

# ----- application config ----------------------------------------------------

variable "cheqd_network" {
  description = "Cheqd network the wallet-server connects to (testnet | mainnet)"
  default     = "testnet"
}

variable "truvera_api_endpoint" {
  description = "Truvera REST API base URL"
  default     = "https://api.truvera.com"
}

# ----- sizing ----------------------------------------------------------------

variable "truvera_api_cpu" {
  description = "CPU units for the truvera-api task (256 | 512 | 1024 | 2048 | 4096)"
  default     = 512
}

variable "truvera_api_memory" {
  description = "Memory (MiB) for the truvera-api task"
  default     = 1024
}

variable "wallet_server_cpu" {
  description = "CPU units for the wallet-server task"
  default     = 1024
}

variable "wallet_server_memory" {
  description = "Memory (MiB) for the wallet-server task"
  default     = 2048
}
