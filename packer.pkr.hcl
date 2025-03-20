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

variable "gcp_demo_id" {
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
      # Add Node.js repository
      "sudo mkdir -p /etc/apt/keyrings",
      "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg",
      "echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${var.node_version}.x nodistro main' | sudo tee /etc/apt/sources.list.d/nodesource.list",
      # Update and install Node.js
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs",
      # Install Yarn
      "curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/yarn-keyring.gpg",
      "echo 'deb [signed-by=/usr/share/keyrings/yarn-keyring.gpg] https://dl.yarnpkg.com/debian stable main' | sudo tee /etc/apt/sources.list.d/yarn.list",
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y yarn"
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
      # Install dependencies
      "sudo -u csye6225 yarn install --production",
      # Run build first
      "sudo -u csye6225 yarn install",
      # Create environment file directory
      "sudo mkdir -p /etc/webapp",
      "sudo chown csye6225:csye6225 /etc/webapp",
      # Create log directory
      "sudo mkdir -p /var/log/webapp",
      "sudo chown csye6225:csye6225 /var/log/webapp",
      # Create systemd service file with better logging and permissions
      "sudo tee /etc/systemd/system/webapp.service << EOF",
      "[Unit]",
      "Description=WebApp Node.js Application",
      "After=network.target",
      "",
      "[Service]",
      "Type=simple",
      "User=csye6225",
      "Group=csye6225",
      "WorkingDirectory=/opt/webapp",
      "EnvironmentFile=/etc/webapp/environment",
      "ExecStart=/usr/bin/yarn start",
      "StandardOutput=append:/var/log/webapp/output.log",
      "StandardError=append:/var/log/webapp/error.log",
      "Restart=always",
      "RestartSec=10",
      "",
      "[Install]",
      "WantedBy=multi-user.target",
      "EOF",
      # Create a placeholder environment file
      "sudo tee /etc/webapp/environment << EOF",
      "PORT=${var.app_port}",
      "# The following will be set by terraform user data:",
      "# DB_HOST=<RDS_ENDPOINT>",
      "# DB_NAME=<DB_NAME>",
      "# DB_USER=<DB_USER>",
      "# DB_PASSWORD=<DB_PASSWORD>",
      "# DB_PORT=<DB_PORT>",
      "EOF",
      "sudo chmod 600 /etc/webapp/environment", # Secure the environment file
      # Set proper permissions
      "sudo chmod 755 /opt/webapp",
      "sudo chmod 644 /etc/systemd/system/webapp.service",
      "sudo touch /var/log/webapp/output.log /var/log/webapp/error.log",
      "sudo chown csye6225:csye6225 /var/log/webapp/output.log /var/log/webapp/error.log",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp"
      # Service will be started by terraform user data after setting DB configuration
    ]
  }

  # Share GCP image with target project
  post-processor "shell-local" {
    only = ["googlecompute.ubuntu"]
    inline = [
      "echo 'Setting up authentication...'",
      "cat > /tmp/packer-gcp-key.json << 'EOF'",
      "${local.gcp_credentials}",
      "EOF",
      "export GOOGLE_APPLICATION_CREDENTIALS=/tmp/packer-gcp-key.json",
      "gcloud auth activate-service-account --key-file=/tmp/packer-gcp-key.json",
      "gcloud config set project ${var.gcp_project_id}",
      "LATEST_IMAGE=$(gcloud compute images list --project=${var.gcp_project_id} --filter=\"name~'webapp-.*'\" --sort-by=~creationTimestamp --limit=1 --format='get(name)')",
      "if [ -n \"$LATEST_IMAGE\" ]; then",
      "  echo \"Sharing image: $LATEST_IMAGE\"",
      "  gcloud compute images create \"$LATEST_IMAGE\" --source-image=\"$LATEST_IMAGE\" --source-image-project=${var.gcp_project_id} --project=${var.gcp_demo_id}",
      "else",
      "  echo \"No webapp image found\"",
      "  exit 1",
      "fi",
      "rm -f /tmp/packer-gcp-key.json"
    ]
  }
}