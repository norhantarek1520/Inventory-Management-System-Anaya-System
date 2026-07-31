# 🚨 Problems & Solutions Log

## Task Name: Multi-Environment Docker Setup, Database Integration & Development Environment

---

## Problem 1: Code Updates Not Reloading Inside Docker Container (`nest start --watch` Fail)

### 🛑 The Problem

Modifying TypeScript files (e.g., `src/user/user.controller.ts`) on the Windows host machine did not trigger live recompilation or server restarts inside the running NestJS Docker container. Developers had to manually restart or rebuild containers after every single code edit.

### 🔍 Cause Analysis

Windows filesystem bind mounts (`.:/app`) do not pass native OS file-system change notifications (`inotify` events) across the host-to-container boundary into Linux containers. Because NestJS's default `--watch` mode relies on `inotify`, it never detects when a file is modified on Windows.

### 💡 The Solution

Switched from standard `inotify` watching to **polling-based file watching** using `nodemon` with `legacyWatch`. Polling manually checks file modification timestamps periodically rather than waiting for OS events.

1. **Installed Nodemon:**
   Added `nodemon` to `devDependencies` in `package.json`.

2. **Created `nodemon.json` Configuration:**
   Created `nodemon.json` in the root folder with `legacyWatch: true`:

   ```json
   {
     "watch": ["src"],
     "ext": "ts",
     "ignore": ["src/**/*.spec.ts", "dist"],
     "legacyWatch": true,
     "delay": 500,
     "exec": "nest start"
   }

   Added Container Startup Script:
   Updated package.json with a dedicated script for Docker:
   ```

JSON
"start:docker": "nodemon --config nodemon.json"
Updated Dockerfile.dev CMD:
Set the development container entrypoint to run the polling script:

Dockerfile
CMD ["npm", "run", "start:docker"]
Rebuilt Container:
Ran docker compose up --build to apply dependencies and configuration.

#

## Problem 2: Container Dependency Conflicts with Host node_modules

🛑 The Problem
Mounting the host root folder (.:/app) into the container risks overwriting the Linux-compiled binaries in the container's node_modules with Windows-compiled host files, leading to missing module errors or binary incompatibilities.

🔍 Cause Analysis
The bind mount .:/app maps the entire project directory into the container, including any node_modules folder present on the host machine.

💡 The Solution
Used an anonymous volume inside docker-compose.yml to preserve and isolate the container's internal /app/node_modules directory:

YAML
volumes:

- .:/app # Mounts host code into container for live updates
- /app/node_modules # Instructs Docker to preserve the container's internal node_modules

#

## Problem 3: Database GUI Service Unable to Reach MongoDB Container

🛑 The Problem
The mongo-express dashboard container failed to connect to the database instance on initial startup.

🔍 Cause Analysis
mongo-express attempted to connect using localhost, which refers to its own isolated container network loopback rather than the separate mongo container host.

💡 The Solution
Configured Docker Compose service name resolution and environment variables so mongo-express targets the mongo service on the internal Docker bridge network:

YAML
environment:

- ME_CONFIG_MONGODB_SERVER=mongo
- ME_CONFIG_MONGODB_PORT=27017
  depends_on:
- mongo
