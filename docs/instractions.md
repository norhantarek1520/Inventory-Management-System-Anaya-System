# 🛠️ Code Conventions & Architectural Standards

Quick reference guide for the **Inventory Management System (IMS)** codebase architecture and formatting rules.

---

## 📁 1. Directory Structure

All code is strictly organized under `src/`:

```text
src/
├── commons/                  # Cross-cutting assets (grouped by domain)
│   ├── dtos/                 # Request/Response payloads with Swagger metadata
│   ├── enums/                # System-wide Enums (e.g., Role)
│   ├── interfaces/           # TypeScript interfaces & contracts
│   └── schema/               # Database ORM schemas/entities
├── database/                 # Core DB connections & migrations
└── modules/                  # Feature domain modules (auth, user, etc.)
```

#

## 📝 2. File Header Standard

Every file must begin with a brief description comment:

TypeScript
/\*\*

- @file auth.service.ts
- @description Handles authentication, JWT lifecycle, and 2FA logic.
  \*/
  🏗️ 3. Class Structure & Method Ordering
  Single-Line Headers: Group sections using // ========================================== N. Title ==========================================.

Public First: Place all public methods above with an explicit public keyword.

Private Last: Place internal utility helpers at the bottom under a dedicated private section.

TypeScript
@Injectable()
export class ExampleService {
private readonly logger = new Logger(ExampleService.name);

// ========================================== 1. Business Methods ==========================================

public async executeAction(dto: any): Promise<void> {
// Step 1: Log action start
this.logger.log('Starting action execution...');

    // Step 2: Transform input
    const data = this.formatData(dto);

}

// ========================================== 2. Private Helpers & Utilities ==========================================

private formatData(input: any): any {
return input;
}
}

#

## ⚙️ 4. Business Logic & Logging Rules

Step Comments: Break methods down with step-by-step numbered inline comments (// Step 1: ..., // Step 2: ...).

Logger: Log step entries and critical execution states using NestJS Logger.

#

## 📚 5. DTO & Swagger Requirements

Every DTO field must include @ApiProperty or @ApiPropertyOptional.

Add clear description, realistic example, and class-validator annotations to every property.

#

## 🤖 Prompt Snippet for AI Code Generation

"Format the code using single-line section headers (// ========================================== N. Title ==========================================), explicit public keywords for public methods placed above, and a dedicated private helper section at the bottom. Ensure every file starts with a description header comment, includes step-by-step numbered comments with logging, and all DTOs are decorated with Swagger metadata (@ApiProperty)."

```

```
