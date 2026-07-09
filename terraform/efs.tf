# EFS file system for wallet-server SQLite databases.
#
# SQLite is a single-writer embedded database. The wallet-server MUST run with
# desired_count=1. Running two tasks against the same EFS path would cause
# SQLite lock errors or data corruption because NFS locking semantics differ
# from POSIX. With a single writer this is safe in practice.
#
# EFS is used instead of EBS because Fargate tasks cannot attach persistent
# EBS volumes in a way that survives task replacement without manual volume
# lifecycle management. EFS is simpler and adequate at desired_count=1.
#
# Horizontal scaling of wallet-server is blocked by SQLite regardless of
# storage backend. Migrating to PostgreSQL (or EDV cloud wallet storage) is
# the path forward when multi-instance capacity is needed.
resource "aws_efs_file_system" "wallets" {
  creation_token   = "truvera-mcp-${var.environment}-wallets"
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = { Name = "truvera-mcp-${var.environment}-wallets" }
}

# One mount target per subnet so the Fargate scheduler can place the task in
# any AZ without losing access to the file system.
resource "aws_efs_mount_target" "wallets" {
  for_each = toset(var.subnet_ids)

  file_system_id  = aws_efs_file_system.wallets.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}

# Access point pins the container root to /wallets and enforces uid/gid 1000
# (the non-root user the app runs as) so all wallet files are owned correctly.
resource "aws_efs_access_point" "wallets" {
  file_system_id = aws_efs_file_system.wallets.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/wallets"
    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "755"
    }
  }

  tags = { Name = "truvera-mcp-${var.environment}-wallets-ap" }
}
