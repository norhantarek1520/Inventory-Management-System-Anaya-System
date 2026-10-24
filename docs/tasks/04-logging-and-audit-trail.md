# Logging & Audit Trail Specification

> Branch: `logging_and_audit`
> Goal of the task: **"log everything in this system — who did it, when, and what they did."**

---

## PART 1 — The Concept: What Logging Actually Is

### 1.1 Definition

A **log** is an immutable, timestamped record of something that happened inside your system.

That is the whole idea. It is not a feature the user sees. It is the system writing down its own history
so that a human (or a machine) can answer questions **after** the fact:

- Why did the server crash at 3 AM?
- Who deleted category `C012`?
- Why is product `P0045` showing stock of `-3`?
- Is someone brute-forcing the login endpoint?

Without logs, a running server is a black box. Code tells you what *can* happen; logs tell you what *did* happen.

---

### 1.2 The critical distinction: two different kinds of logging

This is the single most important thing to understand, and it is where most beginners get confused.
"Logging" is one word covering **two completely different jobs**, with different consumers, different
storage, and different lifetimes.

| | **Application / Operational Logs** | **Audit Logs (Audit Trail)** |
| :--- | :--- | :--- |
| **Question it answers** | "Is the system healthy? Why did this break?" | "Who did this business action, and when?" |
| **Primary reader** | Developer / DevOps engineer | Business owner, manager, auditor, compliance |
| **Example entry** | `[CategoryService] Mongo connection re-established in 240ms` | `User ahmed@anaya.com DELETED category C012 at 2026-10-24 14:03` |
| **Where it lives** | stdout → console → log file / Datadog / CloudWatch | **Your own database** (MongoDB collection) |
| **Lifetime** | Short — hours to ~30 days, then rotated/deleted | Long — months to years, often legally mandated |
| **Can it be lost?** | Yes, acceptable. It's diagnostic noise. | **No.** Losing it is a compliance failure. |
| **Is it queryable by the app?** | No | **Yes** — you build `GET /audit-log` endpoints on it |
| **Mutable?** | Irrelevant | **Append-only. Never updated, never deleted.** |

**The practical consequence for your task:**

Your task says *"log everything with who made it, when, and what he did."* That phrasing — **who / when / what** —
is the definition of an **audit log**, not an operational log. So:

- `console.log` / NestJS `Logger` **cannot satisfy this task alone.** Console output lives in the
  container's stdout buffer. The moment Docker restarts your container, that history is gone forever.
  You cannot query it. You cannot show it to a manager. You cannot filter it by user.
- You need **database persistence**.

But you still want operational logging too, because that is how you debug. So we implement **both**,
and we keep them cleanly separated. That's exactly what this branch does.

---

### 1.3 Log Levels — the severity scale

Every logging system has levels. A level is a label on an entry saying *how much you should care*.
NestJS ships with five, ordered from most to least severe:

| Level | NestJS method | Meaning | Use it when... |
| :--- | :--- | :--- | :--- |
| **error** | `logger.error()` | Something failed. A request died, a DB write was rejected. | An exception was thrown. **Always include the stack trace.** |
| **warn** | `logger.warn()` | Suspicious but survivable. The system recovered or degraded. | Duplicate category code rejected; token expired; retrying a DB connect. |
| **log** (a.k.a. `info`) | `logger.log()` | Normal, noteworthy business events. | "Category C003 created"; "Server listening on :3000". |
| **debug** | `logger.debug()` | Detail useful only while developing. | Dumping a DTO after transformation; the Mongo filter object you built. |
| **verbose** | `logger.verbose()` | Extremely fine-grained tracing. | Entering/leaving every helper function. |

**Why levels matter in practice:** you configure a **minimum level per environment**.

- Development → show everything down to `verbose`. You want the noise; you're hunting bugs.
- Production → show only `log`, `warn`, `error`. `debug` output in production is expensive
  (disk, money on hosted log platforms) and it buries the entries that actually matter.

This is done once, at bootstrap, in `main.ts` — never with scattered `if (isDev)` checks.

---

### 1.4 Anatomy of a good log entry

A log line is only useful if it is **searchable** and **self-contained**. A good entry carries:

1. **Timestamp** — when (always store UTC; render in local time).
2. **Level** — how much to care.
3. **Context** — *which* part of the system spoke. In NestJS this is conventionally the class name
   (`CategoryService`), which is why you always construct the logger as
   `new Logger(CategoryService.name)`.
4. **Message** — a short, human-readable sentence.
5. **Correlation / Request ID** — a unique id shared by every log line belonging to one HTTP request.
   This is what lets you reconstruct a single user's single action out of thousands of interleaved lines
   from concurrent requests. **This is the feature beginners most often skip and most regret skipping.**
6. **Actor** — who. The user id / email from the JWT.
7. **Structured metadata** — the surrounding facts (resource id, duration, status code).

```text
BAD   → console.log('deleted')
       // deleted what? by whom? when? which request?

GOOD  → [2026-10-24 14:03:11] WARN  [CategoryService] [req:a1f3-9c2e] [user:68f2...b1]
        Delete rejected for category C012 — 3 active subcategories still linked (duration: 42ms)
```

---

### 1.5 Structured logging (JSON) vs. plain text

- **Plain text / pretty-printed** — colorized, aligned, easy for *your eyes* in a terminal. Use in development.
- **Structured (JSON)** — every entry is one JSON object: `{"level":"warn","ctx":"CategoryService","userId":"68f2..."}`.
  Ugly to read, but **machine-queryable**. Log platforms (Datadog, Loki, CloudWatch, ELK) can then do
  `level:error AND userId:68f2...` across millions of lines. Use in production.

The professional setup is: pretty in dev, JSON in prod, switched by `NODE_ENV`. Libraries like **Pino**
and **Winston** exist mainly to give you this plus file rotation and transports. We are *not* adding one
in this branch — NestJS's built-in `Logger` plus our own DB-backed audit trail covers the task, with zero
new dependencies. Section 1.9 covers when to graduate to Pino.

---

### 1.6 The golden rule: NEVER log secrets

A log file is a plaintext file, often shipped to a third-party SaaS, often readable by more people than
your database is. Treat every log line as semi-public.

**Never log:** passwords (plain or hashed), JWT access/refresh tokens, `Authorization` headers,
2FA secrets / TOTP seeds, password-reset codes, full credit-card numbers, national IDs.

In this IMS specifically, the dangerous fields are on `User`: `password`, `refreshTokenHash`,
`twoFactorSecret`, `passwordResetCode`. The audit interceptor in this branch therefore runs a
**redaction** step over every request body before persisting it — see `SENSITIVE_FIELDS` in
`audit.interceptor.ts`. Redaction is not optional politeness; it is a security control.

---

### 1.7 What to actually log (and what not to)

**Do log:**
- Every state-changing operation: `POST`, `PATCH`, `PUT`, `DELETE`. These are the audit-relevant ones.
- All authentication events — login success **and** failure, logout, password reset, 2FA setup.
  Failed logins are the highest-value security signal you have.
- Permission denials (403) — someone probing endpoints they shouldn't.
- Every unhandled exception, with its stack trace.
- Application lifecycle: boot, shutdown, DB connect/disconnect.

**Do not log:**
- Successful `GET` requests into the *audit* trail. A category list view is not a business event; it would
  bloat your collection by orders of magnitude for no value. (Operational access logs may include them;
  that's cheap and disposable.) Exception: if you handle regulated personal data, *read* access to it
  sometimes must be audited too — a deliberate, narrow decision, not a default.
- Anything inside a hot loop. Logging does I/O; I/O is slow.
- Secrets (§1.6).

---

### 1.8 Non-obvious properties of a correct audit trail

These are the details that separate a real audit system from a toy one.

1. **Append-only.** An audit record is never updated and never deleted. If it can be edited, it proves
   nothing — the first thing a malicious actor does is edit the log. Enforce it in code (no update/delete
   service methods are exposed) and ideally in DB permissions.
2. **Audit writes must never break business logic.** If saving the audit record fails, the user's
   category must still have been created. Therefore every audit write is wrapped in `try/catch` and
   failures are only reported to the operational logger. An audit system that can 500 your API is worse
   than no audit system.
3. **Log the outcome, not just the attempt.** A record must say whether the action **succeeded or failed**.
   "Ahmed *attempted* to delete C012 and was denied" is often more interesting than a success.
4. **Capture before/after state for updates.** "Ahmed updated product P0045" is nearly useless.
   "Ahmed changed P0045.price from 50 → 500" is the entry that resolves the dispute. This is why the
   schema below has both `before_state` and `after_state`.
5. **Identify the actor even when there isn't one.** Unauthenticated requests (failed login), seeders,
   and cron jobs all produce audit records. They get a `SYSTEM` / `ANONYMOUS` actor rather than being skipped.
6. **Record the request context**, not just the user: IP address and user-agent. This is how you detect
   "this account acted from Cairo and Berlin within 2 minutes."
7. **Immutable identity snapshot.** Store the actor's `email` and `role` *as strings, at the time of the
   action* — not only a `userId` reference. If you store only a reference and the user is later deleted
   or demoted, your historical record silently changes meaning. An audit trail must stay true to the
   moment it describes.
8. **Retention + indexing.** This collection grows forever and is always queried by
   `(user, date)` or `(resource, date)`. Index those. Decide a retention policy deliberately
   (MongoDB TTL indexes can auto-expire, but only apply one if your compliance rules allow it).

---

### 1.9 When to reach for a library

| Need | Solution |
| :--- | :--- |
| Nicer console output, request/response logging, levels | **NestJS built-in `Logger`** (what we use — zero deps) |
| High-throughput JSON logs, file rotation, child loggers | **Pino** (`nestjs-pino`) — fastest; the modern default |
| Many transports (file + email + Slack + HTTP) | **Winston** (`nest-winston`) — more flexible, slower |
| Business audit trail, queryable, permanent | **Your own DB module** (what we build in Part 2B) |
| Crash reporting & alerting | Sentry |
| Searching logs across many servers | Datadog / Grafana Loki / ELK |

Note that the last four rows are **not substitutes for each other**. Pino does not give you an audit
trail; a Mongo audit collection does not give you crash alerting. A mature system runs several of these
at once, which is the whole point of §1.2.

---

## PART 2 — The Implementation

Two approaches, both implemented in this branch, each solving a different half of §1.2.

### 2.A Operational logging — NestJS built-in `Logger`

**Purpose:** developer-facing diagnostics. Goes to stdout. Disposable.

| File | Role |
| :--- | :--- |
| [src/commons/logger/app_logger.service.ts](../../src/commons/logger/app_logger.service.ts) | Custom logger extending `ConsoleLogger`. Adds env-based level filtering + JSON mode for production. |
| [src/commons/middlewares/http_logger.middleware.ts](../../src/commons/middlewares/http_logger.middleware.ts) | Access log: one line per HTTP request with method, URL, status, duration, IP, and the correlation id. |
| [src/commons/middlewares/correlation_id.middleware.ts](../../src/commons/middlewares/correlation_id.middleware.ts) | Assigns each request a unique id (§1.4 item 5) and echoes it in the `X-Request-Id` response header. |
| [src/commons/filters/all_exceptions.filter.ts](../../src/commons/filters/all_exceptions.filter.ts) | Global catch-all: logs every thrown error with stack trace, returns a consistent error body. |

Usage inside any service — one logger per class, named after the class so the context column is useful:

```ts
private readonly logger = new Logger(CategoryService.name);
...
this.logger.log(`Step 1: creating category ${dto.category_code}`);
this.logger.warn(`Duplicate category code rejected: ${dto.category_code}`);
this.logger.error(`Mongo write failed: ${err.message}`, err.stack);
```

### 2.B Audit trail — custom module with MongoDB persistence

**Purpose:** business-facing, permanent, queryable "who / when / what". Survives restarts.

| File | Role |
| :--- | :--- |
| [src/commons/schema/audit_log.schema.ts](../../src/commons/schema/audit_log.schema.ts) | The `audit_logs` collection: actor, action, resource, before/after state, IP, status, timestamp. |
| [src/commons/enums/audit_action.enum.ts](../../src/commons/enums/audit_action.enum.ts) | Controlled vocabulary of actions (`CREATE`, `DELETE`, `LOGIN_FAILED`, …). |
| [src/commons/enums/audit_resource.enum.ts](../../src/commons/enums/audit_resource.enum.ts) | Controlled vocabulary of resources (`CATEGORY`, `PRODUCT`, …). |
| [src/modules/audit_log/audit_log.service.ts](../../src/modules/audit_log/audit_log.service.ts) | `record()` to write (never throws), `findAll()` / `findOne()` to read. No update/delete — append-only (§1.8.1). |
| [src/commons/interceptors/audit.interceptor.ts](../../src/commons/interceptors/audit.interceptor.ts) | **Automatic** capture of every mutating request, success or failure, with redaction. |
| [src/commons/decorators/audit.decorator.ts](../../src/commons/decorators/audit.decorator.ts) | `@Audit({...})` to label a route; `@NoAudit()` to opt a route out. |
| [src/modules/audit_log/audit_log.controller.ts](../../src/modules/audit_log/audit_log.controller.ts) | `GET /audit-log` — read the trail, filtered & paginated, permission-gated. |
| [src/commons/decorators/audit_context.decorator.ts](../../src/commons/decorators/audit_context.decorator.ts) | `@AuditContext()` — hands a service the actor + IP + correlation id it cannot see itself. |
| [src/commons/utils/request_context.util.ts](../../src/commons/utils/request_context.util.ts) | Shared IP resolution + context building, used by the middleware, interceptor, filter and decorator. |

**Two integration styles, and the rule for combining them:**

1. **Global interceptor (automatic)** — registered once in `AppModule`. Catches every `POST`/`PATCH`/
   `PUT`/`DELETE` across the whole app with no per-service code. This is the baseline: it guarantees
   nothing is silently unaudited, including modules written later by someone who forgets about auditing.
   What it *cannot* see is business detail — it only knows the HTTP layer, so it has no `before_state`.

2. **Explicit service call** — `await this.auditLogService.record({...})` inside a service method.
   Verbose, but it is the only way to capture domain facts the HTTP layer can't know:
   the previous value of a field, a computed stock delta, a rejection reason. Use it for
   high-value operations (stock adjustments, price changes, permission grants).

**The rule: never let both fire for the same request.** A route whose service makes an explicit call
must be marked `@NoAudit()`, and must pass `@AuditContext()` down so the single surviving record is
complete. This was learned the hard way during this branch: with both active, every update wrote **two**
rows — one with the before/after diff but no IP or correlation id, one with the request context but no
diff. Two half-complete rows describing one event is worse than either alone, because a reviewer now
has to know to correlate them.

So: the interceptor provides **coverage**, explicit calls provide **depth**, and `@NoAudit()` is what
keeps them from colliding. [category.controller.ts](../../src/modules/category/category.controller.ts)
demonstrates all three cases side by side.

### 2.C Two gaps worth knowing about

Both were found by running the thing, not by reading it:

1. **Guards run before interceptors.** When `JwtAuthGuard` or `PermissionsGuard` rejects a request,
   `AuditInterceptor` never executes — so a 401/403 would never reach the trail, even though "someone
   tried to call an endpoint they are not allowed to" is among the most security-relevant events there
   is. `AllExceptionsFilter` is the first place in the pipeline that sees these, so it writes the
   `ACCESS_DENIED` record. `request.auditHandled` stops the two from double-recording.

2. **`bufferLogs: true` hides a hanging boot.** It holds logs until Nest finishes initialising, so an
   app stuck on an unreachable database is alive and completely silent. `app.flushLogs()` immediately
   after `NestFactory.create()` gets the startup lines out first.

---

## PART 3 — Task Checklist

- [x] Add `AuditAction` / `AuditResource` / `AuditStatus` enums.
- [x] Add `AuditLog` Mongoose schema with compound indexes on `(actor_id, createdAt)` and `(resource, createdAt)`.
- [x] Add `AuditLogService` with a non-throwing `record()` method.
- [x] Add global `AuditInterceptor` with sensitive-field redaction.
- [x] Add `@Audit()` / `@NoAudit()` decorators.
- [x] Add `GET /audit-log` + `GET /audit-log/:id` read endpoints behind `audit:read`.
- [x] Add `AUDIT_READ` permission and grant it to `admin`.
- [x] Add custom `AppLoggerService` with env-based levels and prod JSON output.
- [x] Add correlation-id + HTTP access-log middlewares.
- [x] Add global exception filter that logs stack traces.
- [x] Wire everything in `app.module.ts` / `main.ts`.
- [x] Demonstrate explicit audit calls + `Logger` step comments in `CategoryService`.
- [x] Add `@AuditContext()` so service-written records carry IP / correlation id / duration.
- [x] Label every auth route with `@Audit()` (logins were being recorded as `CREATE AUTH`).
- [x] Record 401/403 denials from `AllExceptionsFilter` (guards run before interceptors).
- [x] Replace every `console.log` in `src/` with the NestJS `Logger`.
- [ ] *(Future)* Add `GET /audit-log/export` for CSV download for compliance reviews.
- [ ] *(Future)* Decide and apply a retention policy (TTL index) once compliance rules are known.
- [ ] *(Future)* Extend explicit audit calls to the product / product-item / user services, following
      the `CategoryService` pattern. They are currently covered by the interceptor alone, so they have
      no `before_state` diff.

---

## PART 4 — Verified Behaviour

Exercised end-to-end against a live MongoDB; all of the following were confirmed, not assumed:

| Check | Result |
| :--- | :--- |
| Exactly one audit record per mutating request (no duplicates) | ✅ |
| Every record carries `request_id`, `ip_address` and `duration_ms` | ✅ |
| Login / failed login / logout recorded as `LOGIN`, `LOGIN`+`FAILURE`, `LOGOUT` | ✅ |
| 401 denial recorded as `ACCESS_DENIED` | ✅ |
| `UPDATE` stores a before/after field diff | ✅ |
| `DELETE` stores the full document as `before_state` | ✅ |
| `TOGGLE_STATUS` recorded as its own action with `is_active` flip | ✅ |
| Passwords stored as `[REDACTED]` | ✅ |
| Plain `GET`s not audited; audit-log reads do not self-audit | ✅ |
| `GET /audit-log?action=LOGIN&status=FAILURE` (brute-force query) works | ✅ |
| No write route on `/audit-log` (append-only) | ✅ |
| Access log levels by status: 2xx→`log`, 4xx→`warn`, 5xx→`error` | ✅ |
| `NODE_ENV=production` emits one JSON object per line | ✅ |
| Upstream `X-Request-Id` honoured and echoed back | ✅ |