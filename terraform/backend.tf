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
#   aws dynamodb create-table \
#     --table-name truvera-mcp-terraform-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-west-1
terraform {
  backend "s3" {
    bucket         = "truvera-mcp-terraform-state"
    key            = "mcp/terraform.tfstate"
    region         = "us-west-1"
    dynamodb_table = "truvera-mcp-terraform-locks"
    encrypt        = true
  }
}
