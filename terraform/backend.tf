# Remote state stored in S3 within each environment's own AWS account.
# The bucket name is the same across accounts — AWS credentials (via
# AWS_PROFILE) determine which account's bucket is used.
#
# Create the bucket and lock table ONCE per account before running
# terraform init (Terraform can't bootstrap its own state bucket):
#
#   aws s3api create-bucket \
#     --bucket truvera-mcp-terraform-state \
#     --region us-west-1 \
#     --create-bucket-configuration LocationConstraint=us-west-1
#
#   aws s3api put-bucket-versioning \
#     --bucket truvera-mcp-terraform-state \
#     --versioning-configuration Status=Enabled
#
terraform {
  backend "s3" {
    bucket       = "truvera-mcp-terraform-state"
    key          = "mcp/terraform.tfstate"
    region       = "us-west-1"
    use_lockfile = true
    encrypt      = true
  }
}
