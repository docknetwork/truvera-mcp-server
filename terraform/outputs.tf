output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the two public subnets (one per AZ)"
  value       = aws_subnet.public[*].id
}

output "alb_dns_name" {
  description = "DNS name of the MCP ALB — create CNAME records pointing both service hostnames here"
  value       = aws_lb.mcp.dns_name
}

output "alb_zone_id" {
  description = "Route 53 hosted zone ID of the ALB (use for alias records)"
  value       = aws_lb.mcp.zone_id
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.mcp.name
}

output "truvera_api_service_name" {
  description = "ECS service name for truvera-api"
  value       = aws_ecs_service.truvera_api.name
}

output "wallet_server_service_name" {
  description = "ECS service name for wallet-server"
  value       = aws_ecs_service.wallet_server.name
}

output "efs_file_system_id" {
  description = "EFS file system ID backing the wallet SQLite databases"
  value       = aws_efs_file_system.wallets.id
}

output "mcp_execution_role_arn" {
  description = "IAM execution role ARN (shared by both services)"
  value       = aws_iam_role.mcp_execution.arn
}
