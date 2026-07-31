# 🔐 Authentication & Authorization Module Specification(Start date 31/7/2026)

## Overview

Implement a secure, token-based authentication and flexible Role-Based Access Control (RBAC) system for the Inventory Management System (IMS).

The system supports five distinct roles:

1. `super_admin` — **System Owner:** Unlimited control over all system features, technical settings, data, and users.
2. `admin` — **Project Manager / Assistant Owner:** Manages staff accounts, assigns custom permissions, reviews operational tasks, and accesses all management reports.
3. `procurement_manager` — Manages product catalog master data and processes purchase orders.
4. `inventory_staff` — Physical stock receiving, expiry tracking, and inventory adjustments.
5. `system_service` — Machine-to-machine API service account for external system integrations (POS & E-COM).

---

## 👥 Role Hierarchy & Capabilities Matrix

| Role                      | Scope & Primary Function                               | User Management | Task/Audit Review | Full System Override |
| :------------------------ | :----------------------------------------------------- | :-------------: | :---------------: | :------------------: |
| **`super_admin`**         | Complete system ownership & infrastructure controls    |       ✅        |        ✅         |          ✅          |
| **`admin`**               | Operational head / Project lead under owner            |       ✅        |        ✅         |          ❌          |
| **`procurement_manager`** | Catalog, pricing, and purchase order lifecycle         |       ❌        |        ❌         |          ❌          |
| **`inventory_staff`**     | On-ground receiving, stock counts, and wastage logging |       ❌        |        ❌         |          ❌          |
| **`system_service`**      | Automated API integration (POS & E-COM)                |       ❌        |        ❌         |          ❌          |

---

## 🎯 Detailed Tasks Checklist

### 1. 👥 User Creation & Onboarding Flow (`super_admin` & `admin`)

- [ ] **Admin-Initiated User Creation Endpoint (`POST /users`)**
  - [ ] Restrict access strictly to `super_admin` and `admin` roles.
  - [ ] Prevent `admin` from creating or modifying `super_admin` accounts (hierarchy check).
  - [ ] Accept `email`, `fullName`, `role` (enum), and custom assigned `permissions` array.
  - [ ] Automatically generate:
    - Unique `user_id` / `employee_code` (e.g., `EMP-1042`).
    - Secure temporary password.
  - [ ] Set `isMustResetPassword = true` on creation.
- [ ] **Automated Onboarding Email Dispatch**
  - [ ] Send welcome email containing:
    - Assigned `Employee Code / User ID`
    - Login Email
    - Temporary Password
    - First-Time Login Link
- [ ] **Mandatory First-Time Password Reset**
  - [ ] Intercept login: If `isMustResetPassword === true`, force redirect to password reset.
  - [ ] Require user to input new strong password before issuing full access token.
  - [ ] Upon successful update, flip `isMustResetPassword = false`.
- [ ] **Post-Reset 2FA Setup Prompt**
  - [ ] Display optional/configurable 2FA Setup Screen (TOTP/Authenticator App) right after password reset.
  - [ ] Allow user to complete 2FA activation or skip based on system security rules.

---

### 2. 🔑 Core Authentication & Session Management

- [ ] **User Login (`POST /auth/login`)**
  - [ ] Validate credentials against stored password hashes (`bcrypt` / `argon2`).
  - [ ] Evaluate onboarding state: If `isMustResetPassword` is true, return a temporary reset token.
  - [ ] If 2FA is active, trigger 2FA verification challenge before issuing session tokens.
- [ ] **Token Architecture (JWT)**
  - [ ] **Access Tokens:** Short-lived (e.g., 15 mins) carrying `sub`, `email`, `role`, and assigned `permissions`.
  - [ ] **Refresh Tokens:** Long-lived (e.g., 7 days) stored securely in `httpOnly` cookies.
  - [ ] **Token Rotation Endpoint (`POST /auth/refresh`):** Issue fresh token pairs seamlessly.
- [ ] **Logout (`POST /auth/logout`)**
  - [ ] Invalidate active refresh tokens on the server/database.

---

### 3. 🛡️ Dynamic Permissions & Role Guards

- [ ] **Granular Permission Schema**
  - [ ] Define action-level permissions (e.g., `users:create`, `reports:read`, `tasks:review`, `products:create`, `stock:adjust`).
  - [ ] Allow `super_admin` and `admin` to assign custom permission overrides during user creation.
- [ ] **Authorization Middleware & Guards**
  - [ ] **`RolesGuard`:** Verify if the user's role matches route requirements.
  - [ ] **`PermissionsGuard`:** Inspect JWT payload's `permissions` array dynamically.
  - [ ] **`SuperAdminBypass`:** Allow `super_admin` to pass all permission checks automatically without needing explicit permission strings assigned.
- [ ] **Machine Service Account Guard (`system_service`)**
  - [ ] Provide dedicated API Key / JWT authentication for POS and E-COM system calls with scope restricted strictly to `stock:read` and `stock:deduct`.

---

### 4. 📊 Analytics, Task Review & Auditing Module

- [ ] **Operational Task Review Endpoint (`GET /tasks/review`)**
  - [ ] Restrict access to `super_admin` and `admin`.
  - [ ] View pending inventory adjustments, PO approvals, and stock count discrepancies logged by staff.
- [ ] **System Management Reports (`GET /reports/...`)**
  - [ ] Allow `super_admin` and `admin` access to financial valuation, inventory turnover, and employee activity logs.

---

### 5. 📧 Password Recovery Lifecycle

- [ ] **Forgot Password Request**
  - [ ] Generate time-limited, single-use reset tokens via email/SMS.
  - [ ] Return generic success responses to prevent account enumeration attacks.
- [ ] **Password Reset Handler**
  - [ ] Verify reset token/OTP, update password hash, and invalidate all active user sessions.
