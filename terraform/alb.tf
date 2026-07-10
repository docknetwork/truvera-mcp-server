# Application Load Balancer — one ALB fronts both MCP services.
# Host-based listener rules route each hostname to its respective target group.
resource "aws_lb" "mcp" {
  name               = "truvera-mcp-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true

  tags = { Name = "truvera-mcp-${var.environment}" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.mcp.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default action returns 404 for requests that don't match either service's
  # hostname rule — acts as a safe catch-all.
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\":\"not found\"}"
      status_code  = "404"
    }
  }
}

# Redirect plain HTTP to HTTPS.
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.mcp.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ---- truvera-api target group -----------------------------------------------

resource "aws_lb_target_group" "truvera_api" {
  name        = "truvera-api-mcp-${var.environment}-tg"
  port        = local.truvera_api_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # required for Fargate awsvpc networking

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }
}

resource "aws_lb_listener_rule" "truvera_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.truvera_api.arn
  }

  condition {
    host_header {
      values = [var.truvera_api_hostname]
    }
  }
}

# ---- wallet-server target group ---------------------------------------------

resource "aws_lb_target_group" "wallet_server" {
  name        = "wallet-mcp-${var.environment}-tg"
  port        = local.wallet_server_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }
}

resource "aws_lb_listener_rule" "wallet_server" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.wallet_server.arn
  }

  condition {
    host_header {
      values = [var.wallet_server_hostname]
    }
  }
}
