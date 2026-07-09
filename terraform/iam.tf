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
# the ECS agent can inject MCP_JWT_PUBLIC_KEY and WALLET_MASTER_KEY at startup.
resource "aws_iam_role_policy" "mcp_execution_secrets" {
  name = "read-wallet-secret"
  role = aws_iam_role.mcp_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = [var.wallet_secret_arn]
    }]
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
# The running container needs Secrets Manager access so that the mint-jwt.js
# admin script can be exec'd inside the task to mint tenant JWTs against the
# private signing key stored in Secrets Manager.
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

# Grants the wallet-server task the ability to read the JWT signing key from
# Secrets Manager — used only when admins exec into the task to run mint-jwt.js.
resource "aws_iam_role_policy" "wallet_server_task_secrets" {
  name = "read-signing-key"
  role = aws_iam_role.wallet_server_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = [var.wallet_secret_arn]
    }]
  })
}
