# Git Branching Strategy & Architecture

This repository follows a structured, phase-based Git branching strategy to ensure code stability, isolated feature development, and reliable deployment workflows across environments.

---

## Core Branches Overview

| Branch       | Environment  | Description & Purpose                                                                                                                                                                                 |
| :----------- | :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`master`** | Production   | **Production-Ready Base:** Contains stable, fully tested code powering the live application. Direct commits are restricted; changes arrive via merged Pull Requests from `stag` or critical hotfixes. |
| **`dev`**    | Development  | **Team Integration:** Active development branch where daily feature branches are merged. Serves as the primary integration point for the development team.                                            |
| **`stag`**   | Staging / QA | **Pre-Release Testing:** Mirrors the production environment. Used by QA and testing teams to validate builds, perform integration tests, and run pre-deployment checks before merging to `master`.    |

---

## Feature Branch: `auth`

The **`auth`** branch is dedicated to implementing the complete identity, authentication, security, and access control infrastructure for the **Anaya Market Inventory Management System (IMS)**.

### Key Responsibilities & Capabilities

#### 1. Role-Based Access Control (RBAC) & Dynamic Permissions

Implements fine-grained access governance using NestJS Guards (`JwtAuthGuard` ➔ `RolesGuard` ➔ `PermissionsGuard`):

- **Persona Roles:** `super_admin`, `admin`, `procurement_manager`, `inventory_staff`, and `system_service`.
- **Guard Pipeline:** Enforces JWT verification, evaluates role hierarchies, and allows granular, explicit permission overrides.

#### 2. User Schema & Entity Management

Governs user lifecycle data models, security flags, 2FA status, password hash storage, and initial onboarding states (e.g., forcing first-time password changes).

---

### Auth API Functions & Endpoints Summary

#### 1. User Registration & Onboarding Lifecycle

- **`POST /auth/register`**
  - **Summary:** Handles new user onboarding and account creation.
- **`POST /auth/first-time-password-reset`**
  - **Summary:** Requires newly created users to update their temporary credentials on first login and updates system security flags.
- **`POST /auth/2fa/setup`**
  - **Summary:** Initiates Two-Factor Authentication (2FA) configuration for user accounts.
- **`POST /auth/2fa/verify`**
  - **Summary:** Verifies the 2FA setup code to finalize multi-factor authentication activation.

#### 2. Core Authentication & Session Management

- **`POST /auth/login`**
  - **Summary:** Validates user credentials and issues JWT Access and Refresh Tokens upon successful authentication.
- **`POST /auth/refresh-token`**
  - **Summary:** Accepts a valid refresh token payload to issue a new short-lived JWT access token without re-login.
- **`POST /auth/logout`**
  - **Summary:** Terminates the current active session and invalidates the user's refresh token.

#### 3. Password Recovery Lifecycle

- **`POST /auth/forgot-password`**
  - **Summary:** Triggers a password recovery process by generating a reset token and dispatching verification instructions.
- **`POST /auth/reset-password`**
  - **Summary:** Accepts a valid reset token and updates the user's account with a new encrypted password.
