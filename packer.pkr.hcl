packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1.2.6"
    }
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = "~> 1.1.1"
    }
  }
}

# Variables for AWS
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "default"
}

variable "aws_demo_id" {
  type = string
}

# Variables for GCP
variable "gcp_project_id" {
  type = string
}

variable "gcp_target_project_id" {
  type        = string
  description = "The project ID to share the image with"
}

variable "gcp_zone" {
  type    = string
  default = "us-central1-a"
}

# GCP Service Account Variables
variable "gcp_service_account_type" {
  type    = string
  default = "service_account"
}

variable "gcp_private_key_id" {
  type      = string
  sensitive = true
}

variable "gcp_private_key" {
  type      = string
  sensitive = true
}

variable "gcp_client_email" {
  type = string
}

variable "gcp_client_id" {
  type = string
}

# Application Variables
variable "db_name" {
  type    = string
  default = "postgres"
}

variable "db_user" {
  type    = string
  default = "postgres"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "db_port" {
  type    = string
  default = "5432"
}

variable "app_port" {
  type    = string
  default = "8080"
}

variable "node_version" {
  type    = string
  default = "18"
}

locals {
  gcp_credentials = jsonencode({
    type                        = var.gcp_service_account_type
    project_id                  = var.gcp_project_id
    private_key_id              = var.gcp_private_key_id
    private_key                 = var.gcp_private_key
    client_email                = var.gcp_client_email
    client_id                   = var.gcp_client_id
    auth_uri                    = "https://accounts.google.com/o/oauth2/auth"
    token_uri                   = "https://oauth2.googleapis.com/token"
    auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
    client_x509_cert_url        = "https://www.googleapis.com/robot/v1/metadata/x509/${var.gcp_client_email}"
    universe_domain             = "googleapis.com"
  })
}

# Common source blocks
source "amazon-ebs" "ubuntu" {
  profile = var.aws_profile
  region  = var.aws_region

  source_ami = "ami-029f33a91738d30e9"

  instance_type = "t2.micro"
  ssh_username  = "ubuntu"
  ami_name      = "webapp-{{timestamp}}"
  ami_users     = [var.aws_demo_id]

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = 20
    volume_type           = "gp2"
    delete_on_termination = true
  }
}

source "googlecompute" "ubuntu" {
  project_id   = var.gcp_project_id
  zone         = var.gcp_zone
  account_file = local.gcp_credentials

  source_image_family     = "ubuntu-2404-lts-amd64"
  ssh_username            = "ubuntu"
  image_name              = "webapp-{{timestamp}}"
  image_family            = "webapp"
  image_storage_locations = ["us"]
  image_labels = {
    created_by = "packer"
  }

  disk_size    = 20
  disk_type    = "pd-standard"
  machine_type = "e2-medium"
}

build {
  sources = [
    "source.amazon-ebs.ubuntu",
    "source.googlecompute.ubuntu"
  ]

  # Create local user csye6225
  provisioner "shell" {
    inline = [
      "sudo groupadd csye6225",
      "sudo useradd -m -s /usr/sbin/nologin -g csye6225 csye6225"
    ]
  }

  # Install required packages
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg lsb-release",
      # Add PostgreSQL repository
      "curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg",
      "echo 'deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ noble-pgdg main' | sudo tee /etc/apt/sources.list.d/postgresql.list",
      # Add Node.js repository
      "sudo mkdir -p /etc/apt/keyrings",
      "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg",
      "echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${var.node_version}.x nodistro main' | sudo tee /etc/apt/sources.list.d/nodesource.list",
      # Update and install packages with retries
      "for i in {1..3}; do",
      "  if sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-14 postgresql-contrib-14; then",
      "    break",
      "  else",
      "    echo \"Attempt $i failed. Waiting before retry...\"",
      "    sleep 10",
      "  fi",
      "done",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs",
      # Install Yarn
      "curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/yarn-keyring.gpg",
      "echo 'deb [signed-by=/usr/share/keyrings/yarn-keyring.gpg] https://dl.yarnpkg.com/debian stable main' | sudo tee /etc/apt/sources.list.d/yarn.list",
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y yarn",
      # Start PostgreSQL with retry
      "for i in {1..5}; do",
      "  sudo systemctl start postgresql",
      "  if sudo systemctl is-active --quiet postgresql; then",
      "    echo 'PostgreSQL started successfully'",
      "    break",
      "  else",
      "    echo \"PostgreSQL start attempt $i failed. Waiting before retry...\"",
      "    sleep 10",
      "  fi",
      "done",
      "sudo systemctl enable postgresql"
    ]
  }

  # Configure PostgreSQL with retry mechanism and proper initialization wait
  provisioner "shell" {
    inline = [
      "echo 'Waiting for PostgreSQL to be ready...'",
      "for i in {1..30}; do",
      "  if sudo -u postgres psql -c '\\l' >/dev/null 2>&1; then",
      "    echo 'PostgreSQL is ready'",
      "    break",
      "  fi",
      "  echo 'Waiting for PostgreSQL to start...'",
      "  sleep 2",
      "done",
      "for i in {1..5}; do",
      "  if sudo -u postgres psql -c \"ALTER USER ${var.db_user} PASSWORD '${var.db_password}';\"; then",
      "    echo 'PostgreSQL configuration successful'",
      "    break",
      "  else",
      "    echo \"Attempt $i failed. Waiting before retry...\"",
      "    sleep 10",
      "  fi",
      "  if [ $i -eq 5 ]; then",
      "    echo 'Failed to configure PostgreSQL after 5 attempts'",
      "    exit 1",
      "  fi",
      "done"
    ]
  }

  # Create app directory and set permissions
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/webapp",
      "sudo chown -R ubuntu:ubuntu /opt/webapp"
    ]
  }

  # Copy application files
  provisioner "file" {
    source      = "./"
    destination = "/opt/webapp"
  }

  # Setup environment and start application
  provisioner "shell" {
    inline = [
      "sudo chown -R csye6225:csye6225 /opt/webapp",
      "cd /opt/webapp",
      "sudo tee /etc/systemd/system/webapp.service << EOF",
      "[Unit]",
      "Description=WebApp Node.js Application",
      "After=network.target postgresql.service",
      "",
      "[Service]",
      "Type=simple",
      "User=csye6225",
      "WorkingDirectory=/opt/webapp",
      "Environment=DB_NAME=${var.db_name}",
      "Environment=DB_USER=${var.db_user}",
      "Environment=DB_PASSWORD=${var.db_password}",
      "Environment=DB_HOST=localhost",
      "Environment=DB_PORT=${var.db_port}",
      "Environment=PORT=${var.app_port}",
      "ExecStart=/usr/bin/yarn start",
      "Restart=always",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "EOF",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp",
      "sudo systemctl start webapp"
    ]
  }

  # Share GCP image with target project
  post-processor "shell-local" {
    only = ["googlecompute.ubuntu"]
    inline = [
      "LATEST_IMAGE=$(gcloud compute images list --project=${var.gcp_project_id} --filter=\"name~'webapp-.*'\" --sort-by=~creationTimestamp --limit=1 --format='get(name)')",
      "if [ -n \"$LATEST_IMAGE\" ]; then",
      "  echo \"Sharing image: $LATEST_IMAGE\"",
      "  gcloud compute images create \"$LATEST_IMAGE\" --source-image=\"$LATEST_IMAGE\" --source-image-project=${var.gcp_project_id} --project=${var.gcp_target_project_id}",
      "else",
      "  echo \"No webapp image found\"",
      "  exit 1",
      "fi"
    ]
  }
}