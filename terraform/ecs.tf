resource "aws_ecs_cluster" "mcp" {
  name = "truvera-mcp-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "mcp" {
  cluster_name       = aws_ecs_cluster.mcp.name
  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ---- truvera-api task & service ---------------------------------------------

resource "aws_ecs_task_definition" "truvera_api" {
  family                   = "truvera-api-mcp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.truvera_api_cpu
  memory                   = var.truvera_api_memory
  execution_role_arn       = aws_iam_role.mcp_execution.arn
  task_role_arn            = aws_iam_role.truvera_api_task.arn

  container_definitions = jsonencode([{
    name      = "truvera-api-mcp"
    image     = var.truvera_api_image
    essential = true

    portMappings = [{
      containerPort = local.truvera_api_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "MCP_MODE",             value = "http" },
      { name = "MCP_PORT",             value = tostring(local.truvera_api_port) },
      { name = "TRUVERA_API_ENDPOINT", value = var.truvera_api_endpoint },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.truvera_api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:${local.truvera_api_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

# truvera-api is stateless — safe to deploy with rolling updates and no
# minimum healthy percent constraint.
resource "aws_ecs_service" "truvera_api" {
  name            = "truvera-api-mcp-service"
  cluster         = aws_ecs_cluster.mcp.id
  task_definition = aws_ecs_task_definition.truvera_api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.truvera_api_task.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.truvera_api.arn
    container_name   = "truvera-api-mcp"
    container_port   = local.truvera_api_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener_rule.truvera_api]
}

# ---- wallet-server task & service -------------------------------------------

resource "aws_ecs_task_definition" "wallet_server" {
  family                   = "wallet-mcp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.wallet_server_cpu
  memory                   = var.wallet_server_memory
  execution_role_arn       = aws_iam_role.mcp_execution.arn
  task_role_arn            = aws_iam_role.wallet_server_task.arn

  # EFS volume: the access point restricts the task to /wallets on the EFS,
  # which is mounted at /data inside the container.
  volume {
    name = "wallets"
    efs_volume_configuration {
      file_system_id          = aws_efs_file_system.wallets.id
      transit_encryption      = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.wallets.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name      = "wallet-mcp"
    image     = var.wallet_server_image
    essential = true

    portMappings = [{
      containerPort = local.wallet_server_port
      protocol      = "tcp"
    }]

    mountPoints = [{
      sourceVolume  = "wallets"
      containerPath = "/data"
      readOnly      = false
    }]

    environment = [
      { name = "MCP_MODE",             value = "http" },
      { name = "MCP_PORT",             value = tostring(local.wallet_server_port) },
      { name = "MCP_AUTH_MODE",        value = "jwt" },
      { name = "CHEQD_NETWORK",        value = var.cheqd_network },
      { name = "WALLET_DB_BASE_PATH",  value = "/data/wallets" },
    ]

    # MCP_JWT_PUBLIC_KEY, WALLET_MASTER_KEY, and ADMIN_REVOKE_SECRET are injected
    # from Secrets Manager at task startup by the execution role. The secret
    # must be a JSON object with those three keys — see the wallet_secret_arn
    # variable comment.
    secrets = [
      {
        name      = "MCP_JWT_PUBLIC_KEY"
        valueFrom = "${var.wallet_secret_arn}:MCP_JWT_PUBLIC_KEY::"
      },
      {
        name      = "WALLET_MASTER_KEY"
        valueFrom = "${var.wallet_secret_arn}:WALLET_MASTER_KEY::"
      },
      {
        name      = "ADMIN_REVOKE_SECRET"
        valueFrom = "${var.wallet_secret_arn}:ADMIN_REVOKE_SECRET::"
      },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.wallet_server.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:${local.wallet_server_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30 # wallet-server initialises SQLite on first boot; allow extra time
    }
  }])
}

# wallet-server is stateful (EFS-backed SQLite). desired_count MUST remain 1.
# Running two tasks simultaneously would cause SQLite write conflicts.
# See efs.tf for a full explanation of the single-writer constraint.
resource "aws_ecs_service" "wallet_server" {
  name            = "wallet-mcp-service"
  cluster         = aws_ecs_cluster.mcp.id
  task_definition = aws_ecs_task_definition.wallet_server.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.wallet_server_task.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.wallet_server.arn
    container_name   = "wallet-mcp"
    container_port   = local.wallet_server_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [
    aws_lb_listener_rule.wallet_server,
    aws_efs_mount_target.wallets,
  ]
}
