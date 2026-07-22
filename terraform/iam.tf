# Shared ECS task execution role — used by both services.
# The execution role is assumed by the ECS agent (not the application) to pull
# images from ECR and inject Secrets Manager values as environment variables.
resource "aws_iam_role" "mcp_execution" {
  name = "truvera-mcp-${var.environment}-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "mcp_execution_managed" {
  role       = aws_iam_role.mcp_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The standard AmazonECSTaskExecutionRolePolicy does NOT include Secrets Manager
# access. This inline policy grants read access to the wallet-server secret so
# the ECS agent can inject MCP_JWT_PUBLIC_KEY, WALLET_MASTER_KEY, and
# ADMIN_REVOKE_SECRET at startup.
resource "aws_iam_role_policy" "mcp_execution_secrets" {
  name = "read-wallet-secret"
  role = aws_iam_role.mcp_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = [var.wallet_secret_arn]
      },
      # kms:Decrypt is a KMS action: its Resource must be a KMS key ARN, not a
      # Secrets Manager secret ARN (the latter silently matches nothing). Secrets
      # here are encrypted with the account's default aws/secretsmanager key, so
      # scope this to any key reached only via the Secrets Manager service.
      {
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Task role for the truvera-api service.
# The application itself makes no AWS API calls (it's a stateless passthrough
# proxy), so this role needs no extra permissions.
resource "aws_iam_role" "truvera_api_task" {
  name = "truvera-api-mcp-${var.environment}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Task role for the wallet-server service.
# The application itself makes no AWS API calls beyond what the execution role
# already handles at startup. Admins mint tenant JWTs with scripts/mint-jwt.js
# run from their own machine against their own AWS profile (see
# apps/wallet-server/README.md) — the private signing key is never read by the
# running task, so this role needs no Secrets Manager access.
resource "aws_iam_role" "wallet_server_task" {
  name = "wallet-mcp-${var.environment}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}
