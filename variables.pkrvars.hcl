# AWS Variables
aws_profile = "dev"
aws_region  = "us-east-1"

# GCP Variables
gcp_project_id = "development-452115"
gcp_zone       = "us-central1-a"
gcp_private_key_id = "363658df2e98fd43d005340734d6d96c8cf1e30f"
gcp_client_email = "packer-builder@development-452115.iam.gserviceaccount.com"
gcp_client_id = "110510077146502973578"

# Application Variables
db_name = "postgres"
db_user = "postgres"
db_password = "password"
db_port = "5432"
app_port = "8080"
node_version = "23"

# Store the private key in a separate file or use environment variables instead
# gcp_private_key = "SENSITIVE - DO NOT STORE HERE" 