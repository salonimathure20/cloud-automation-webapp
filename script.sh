#!/bin/sh

# Update package lists
apt update -y
apt upgrade -y

# Install PostgreSQL and unzip
apt install -y postgresql postgresql-contrib unzip

# Start and enable PostgreSQL service
systemctl start postgresql
systemctl enable postgresql

# Create a database
su - postgres -c "psql -c 'CREATE DATABASE csye6225;'"

# Create a new Linux group for the application
groupadd appgroup

# Create a new user for the application
useradd -m -g appgroup appuser

# Create application directory
mkdir -p /opt/csye6225

# Unzip the application 
unzip /tmp/webapp.zip -d /opt/csye6225/

# Set permissions
chown -R appuser:appgroup /opt/csye6225
chmod -R 750 /opt/csye6225

echo "Setup completed successfully!"
