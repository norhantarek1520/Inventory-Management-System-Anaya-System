# 🛒 Inventory Management System (IMS) — Anaya Market

> **The Single Source of Truth for Enterprise Product Data, Multi-Branch Stock Visibility, Automated Procurement, and Logistics Reconciliation.**

---

## 📌 Executive Summary

The **Inventory Management System (IMS)** serves as the central operational engine for **Anaya Market**. It governs end-to-end supply chain execution—from initial product master data registration and supplier procurement to main warehouse receiving, batch expiry tracking, branch logistics, and real-time checkout inventory deduction.

By integrating machine-to-machine APIs with physical POS terminals and E-Commerce platforms, IMS eliminates stock discrepancies, prevents out-of-stock scenarios via automated reorder points, and guarantees full batch traceability across all retail channels.

---

## 🎯 Core Capabilities & Key Functions

- 🏷️ **Master Data Management**: Centralized registration of products, category trees, retail pricing, supplier profiles, and unique **Stock Keeping Unit (SKU)** / barcode generation.
- 📦 **Real-Time Multi-Location Tracking**: Complete visibility into inventory balances across the primary distribution center and all retail branch stores.
- ⚡ **Automated Procurement Engine**: Dynamic generation of Purchase Orders (POs) when stock thresholds drop below predefined safety/reorder points.
- 🚚 **Logistics & Reconciliation**: Inter-branch transfer requests, goods shipment tracking, and discrepancy reconciliation.
- 🛡️ **Quality Control & Expiry Management**: Batch-level tracking to monitor perishables, manage First-Expiry, First-Out (FEFO) picking, and log shrinkage/disposals.
- 🤖 **Omnichannel Machine Service API**: High-speed REST APIs enabling POS registers and E-Commerce microservices to lock, query, and deduct stock synchronously.

---

## 👥 Roles & Authorization Hierarchy

IMS implements a fine-grained Role-Based Access Control (RBAC) architecture with five primary system personas:

| Icon | Role | Key Function & Scope | Target Persona |
| :---: | :--- | :--- | :--- |
| 👑 | **`super_admin`** | Full platform control, infrastructure override, database management, and complete audit log review. | System Owner / Lead Engineer |
| 👔 | **`admin`** | Operational management under owner, staff onboarding, permission assignment, and management reporting. | Project Lead / Assistant Manager |
| 🏷️ | **`procurement_manager`** | Master catalog control, pricing structures, supplier management, and PO lifecycle management. | Purchasing Officer |
| 📦 | **`inventory_staff`** | On-ground Goods Received Note (GRN) entry, physical stock counts, expiry checks, and shrinkage logging. | Warehouse Staff / Store Clerk |
| 🤖 | **`system_service`** | Non-human machine-to-machine API key authentication for POS and E-Commerce synchronization. | Automated POS & E-COM Microservices |


## 🏗️ Architecture & Directory Blueprint
The project is built with NestJS, adhering to a clean domain-driven layout:

      src/
      ├── commons/                  # Cross-cutting assets (grouped by domain)
      │   ├── dtos/                 # Request/Response payloads with Swagger specs
      │   ├── enums/                # System enums (Roles, Statuses)
      │   ├── interfaces/           # Module contracts & typings
      │   └── schema/               # Database ORM entities & schema definitions
      ├── database/                 # Core DB connection & setup logic
      └── modules/                  # Application domain modules
          ├── app/                  # Application root configuration
          ├── auth/                 # JWT Auth, 2FA, session lifecycle
          └── user/                 # User management & onboarding workflow

## 🐳 Docker Infrastructure & Environment Services
The system runs on a containerized infrastructure orchestrating MongoDB, Mongo Express (UI), and the NestJS API application:

🚀 Getting Started with Docker
### 1. Clone the Repository
      git clone [https://github.com/norhantarek1520/Inventory-Management-System-Anaya-System.git](https://github.com/norhantarek1520/Inventory-Management-System-Anaya-System.git)
      cd "Inventory-Management-System-Anaya-System"
### 2. Start the Application Environment
  Run Docker Compose to spin up MongoDB, Mongo Express, and the API container:
          
     docker compose up -d --build
### 3. Verify Container Status
Check if all three services are running:
        
    docker compose ps
