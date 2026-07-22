locals {
  truvera_api_port   = 3000
  wallet_server_port = 3001
}

# Security group for the Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "truvera-mcp-${var.environment}-alb-sg"
  description = "Allow inbound HTTPS to the MCP ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "truvera-mcp-${var.environment}-alb-sg" }
}

# Security group for the truvera-api ECS task.
# Accepts traffic only from the ALB; egress is open for HTTPS to the Truvera
# REST API and ECR image pulls.
resource "aws_security_group" "truvera_api_task" {
  name        = "truvera-api-mcp-${var.environment}-fargate-sg"
  description = "Allow ALB ingress to truvera-api MCP task"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = local.truvera_api_port
    to_port         = local.truvera_api_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound (HTTPS to Truvera API, ECR, Secrets Manager)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "truvera-api-mcp-${var.environment}-fargate-sg" }
}

# Security group for the wallet-server ECS task.
# Accepts traffic only from the ALB; egress is open for Cheqd RPC, ECR, and
# Secrets Manager calls.
resource "aws_security_group" "wallet_server_task" {
  name        = "wallet-mcp-${var.environment}-fargate-sg"
  description = "Allow ALB ingress to wallet-server MCP task"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From ALB"
    from_port       = local.wallet_server_port
    to_port         = local.wallet_server_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound (Cheqd RPC, ECR, EFS, Secrets Manager)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "wallet-mcp-${var.environment}-fargate-sg" }
}

# Security group for the EFS mount target.
# Only accepts NFS from the wallet-server task SG — truvera-api cannot reach it.
resource "aws_security_group" "efs" {
  name        = "wallet-mcp-${var.environment}-efs-sg"
  description = "NFS access from wallet-server task only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "NFS from wallet-server task"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.wallet_server_task.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "wallet-mcp-${var.environment}-efs-sg" }
}
