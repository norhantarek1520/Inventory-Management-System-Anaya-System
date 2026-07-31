# 🛠️ Task 01: Multi-Environment Docker Setup & Database Connectivity

## 📌 Task Overview

The goal of this task is to set up a containerized development, staging, and production environment for the **Inventory Management System (IMS)** microservice using Docker, connect MongoDB alongside Mongo Express for database management, and establish seamless local hot-reloading.

---

## 🎯 Key Objectives & Requirements

1. **Multi-Environment Dockerfiles:** Create 3 distinct Dockerfile configurations (`Dockerfile.dev`, `Dockerfile.stage`, `Dockerfile.production`).
2. **Database Integration:** Connect MongoDB to the NestJS application container via Docker Compose.
3. **Database GUI:** Integrate **Mongo Express** into Docker Compose to provide an interactive web client for managing database collections.
4. **Hot-Reload / Live Reloading:** Configure automatic code reloading inside the container whenever code changes occur in the host workspace.

---

## 🛠️ Implementation Steps

### 1. Docker Multi-Environment Setup

Created environment-specific Dockerfiles in the project root:

- `Dockerfile.dev` — Configured for development with live polling enabled.
- `Dockerfile.stage` — Optimized build stage for QA/Testing environments.
- `Dockerfile.production` — Multi-stage build producing a lightweight production image.

---

### 2. Services Configuration (`docker-compose.yml`)

Configured Docker Compose to orchestrate three main services:

- **`ims-app`**: NestJS microservice running from `Dockerfile.dev`.
- **`mongo`**: Official MongoDB image with persistent volume storage (`mongo_data`).
- **`mongo-express`**: Web GUI mapped to port `8081` connected directly to the MongoDB container network.

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: ims_backend_dev
    ports:
      - '3000:3000'
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - MONGO_URI=mongodb://mongo:27017/ims_db
    depends_on:
      - mongo

  mongo:
    image: mongo:latest
    container_name: ims_mongodb
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db

  mongo-express:
    image: mongo-express:latest
    container_name: ims_mongo_express
    ports:
      - '8081:8081'
    environment:
      - ME_CONFIG_MONGODB_SERVER=mongo
      - ME_CONFIG_MONGODB_PORT=27017
    depends_on:
      - mongo

volumes:
  mongo_data:
```
