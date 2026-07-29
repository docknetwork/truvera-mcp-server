# Remote state, stored in S3. Each environment (prod/staging/test) deploys to
# its own AWS account, so each needs its own state bucket: S3 bucket names are
# globally unique, so all three accounts trying to create the literal name
# "truvera-mcp-terraform-state" would only succeed for the first one.
#
# `bucket` is deliberately omitted here (a "partial" backend config) and
# supplied per environment at init time from terraform/environments/<env>.backend.hcl,
# which name the bucket "truvera-mcp-terraform-state-<env>":
#
#   terraform init -backend-config=environments/prod.backend.hcl
#
# Locking uses Terraform's native S3 lockfile support (use_lockfile), not a
# DynamoDB lock table — no separate lock table needs to be created.
#
# Create the environment's bucket ONCE, in that environment's own account,
# before running terraform init (Terraform can't bootstrap its own state
# bucket):
#
#   aws s3api create-bucket \
#     --bucket truvera-mcp-terraform-state-<env> \
#     --region us-west-1 \
#     --create-bucket-configuration LocationConstraint=us-west-1
#
#   aws s3api put-bucket-versioning \
#     --bucket truvera-mcp-terraform-state-<env> \
#     --versioning-configuration Status=Enabled
#
terraform {
  backend "s3" {
    key          = "mcp/terraform.tfstate"
    region       = "us-west-1"
    use_lockfile = true
    encrypt      = true
  }
}
