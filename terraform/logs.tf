resource "aws_cloudwatch_log_group" "truvera_api" {
  name              = "/fargate/service/truvera-api-mcp"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "wallet_server" {
  name              = "/fargate/service/wallet-mcp"
  retention_in_days = 30
}
