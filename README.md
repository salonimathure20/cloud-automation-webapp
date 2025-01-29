# Application Setup Guide

## Prerequisites

Before you begin, ensure you have the following tools installed:

- **Node.js** and **Yarn**
  - Install Yarn: [Yarn Installation Guide](https://classic.yarnpkg.com/lang/en/docs/install/)

## Database Server Setup Using Docker and DBeaver

### 1. Create a Docker Container for PostgreSQL Database

- Pull the latest PostgreSQL image:

  ```bash
  docker pull postgres:latest
  ```

- Run the PostgreSQL container:

  ```bash
  docker run --name {your_container_name} -e POSTGRES_PASSWORD={your_password} -p 5433:5432 -d {your_db_name}
  ```

- Ensure the container is running on Docker.

### 2. Connect to the Database Server Using DBeaver

- Open DBeaver and add a new connection.
- Enter the connection details for your PostgreSQL container:
  - **Host**: `localhost`
  - **Port**: `5433` (or the port you've mapped)
  - **Database**: `{your_db_name}`
  - **Username**: `postgres`
  - **Password**: `{your_password}`

## Running the Application

1. Ensure the PostgreSQL container is running.
2. Add the PostgreSQL connection variables to your `.env` file.
3. Install dependencies:
   ```bash
   yarn install
   ```
4. Start the application:
   ```bash
   yarn start
   ```
