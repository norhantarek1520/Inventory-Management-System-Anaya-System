/**
 * @file audit.interceptor.ts
 * @description APPROACH B (automatic mode) — a global interceptor that writes an audit record
 *              for every state-changing HTTP request, on success AND on failure.
 */

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from 'src/modules/audit_log/audit_log.service';
import { AUDIT_KEY, NO_AUDIT_KEY, AuditOptions } from '../decorators';
import { AuditAction, AuditResource, AuditStatus } from '../enums';
import { RequestWithContext } from '../interfaces';
import { buildAuditContext } from '../utils';

/**
 * ============================ WHY AN INTERCEPTOR? ============================
 *
 * The alternative is calling `auditLogService.record(...)` by hand in every service method.
 * That works (and we also do it — see CategoryService), but as the ONLY strategy it has a
 * fatal flaw: coverage depends on every developer remembering. Six months from now someone
 * adds a `supplier` module, forgets the audit call, and nothing warns them. The gap is only
 * discovered when an auditor asks who changed a supplier's bank details and nobody can say.
 *
 * A global interceptor inverts that default. Auditing is ON for everything, and a developer
 * must explicitly opt OUT with @NoAudit(). Silence now means "audited", not "forgotten".
 *
 * ============================ WHAT IT CANNOT DO ============================
 *
 * An interceptor sits at the HTTP layer, so it only knows what HTTP knows: method, path,
 * body, and the response. It cannot know the entity's PREVIOUS state, because by the time it
 * sees the response the update has already happened. So `before_state` is always null here.
 *
 * That limitation is exactly why both approaches exist together:
 *   - This interceptor gives COVERAGE (nothing is missed).
 *   - Explicit service calls give DEPTH (before/after diffs, business reasons).
 *
 * ============================ WHY `tap` AND NOT `map`? ============================
 *
 * `tap` is a side-effect operator: it observes the stream without altering it. `map` would
 * require us to return the value and risks accidentally changing the API response. Auditing
 * must be invisible to the client, so `tap` is the correct tool. We pass BOTH `next` and
 * `error` handlers so that failures get recorded too — a denied or rejected attempt is often
 * the most interesting entry in the trail (docs §1.8.3).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  /**
   * Fields scrubbed from any captured request body before persistence.
   *
   * This is a SECURITY CONTROL, not politeness (docs §1.6). The audit collection is read by
   * managers and auditors — a wider audience than your database normally has — so a password
   * or refresh token landing here is a real credential leak. Matching is case-insensitive and
   * recursive, because a secret can be nested anywhere in a payload.
   */
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'new_password',
    'old_password',
    'confirm_password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'access_token',
    'refresh_token',
    'refreshToken',
    'refreshTokenHash',
    'authorization',
    'twoFactorSecret',
    'two_factor_secret',
    'otp',
    'passwordResetCode',
    'password_reset_code',
    'secret',
    'apiKey',
    'api_key',
  ];

  /** HTTP verbs that change state. Only these are audited by default (docs §1.7). */
  private static readonly MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  // ========================================== 1. Entry Point ==========================================

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Step 1: Only HTTP traffic is auditable here. If this app later adds WebSocket gateways
    // or microservice message handlers, `getType()` would be 'ws'/'rpc' and `getRequest()`
    // would return undefined — so we bail out rather than crash.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();

    // Step 2: Respect an explicit @NoAudit() opt-out.
    const skipAudit = this.reflector.getAllAndOverride<boolean>(NO_AUDIT_KEY, [context.getHandler(), context.getClass()]);
    if (skipAudit) {
      return next.handle();
    }

    // Step 3: Read any @Audit({...}) metadata the route declared.
    const auditOptions = this.reflector.getAllAndOverride<AuditOptions>(AUDIT_KEY, [context.getHandler(), context.getClass()]) ?? {};

    // Step 4: Decide whether this request is worth a permanent record.
    // Plain GETs are skipped: recording every category-list view would multiply the collection
    // size by orders of magnitude and tell you nothing a business reader cares about. A GET is
    // only audited when a route explicitly asks for it via @Audit({ action: READ }).
    if (!this.shouldAudit(request.method, auditOptions)) {
      return next.handle();
    }

    // Step 5: Snapshot everything we need BEFORE the handler runs.
    //
    // This matters more than it looks. Some handlers mutate `request.body` (a pipe transform,
    // or a service that deletes a field). If we read the body in the `tap` callback instead,
    // we would be auditing the post-handler leftovers rather than what the user actually sent.
    const snapshot = this.captureRequestSnapshot(request, auditOptions);
    const startedAt = Date.now();

    // Step 5b: Mark the request as audited here.
    //
    // AllExceptionsFilter also writes audit records — but only for 401/403 denials, which
    // guards reject BEFORE any interceptor runs and which would otherwise never reach the
    // trail at all. This flag is how the filter tells the two cases apart: if we got this
    // far, the request is already accounted for, so the filter must not write a second
    // record for it.
    request.auditHandled = true;

    // Step 6: Let the handler run, then record the outcome either way.
    return next.handle().pipe(
      tap({
        // --- 6a. SUCCESS path ---
        next: (responseBody) => {
          void this.auditLogService.record({
            ...snapshot,
            status: AuditStatus.SUCCESS,
            // The resource id often only exists after the fact: on a POST, Mongo generates
            // `_id` during the handler. So we try the URL param first, then the response body.
            resource_id: snapshot.resource_id ?? this.extractResourceId(responseBody),
            duration_ms: Date.now() - startedAt,
          });
        },

        // --- 6b. FAILURE path ---
        error: (error) => {
          void this.auditLogService.record({
            ...snapshot,
            status: AuditStatus.FAILURE,
            description: `${snapshot.description} — FAILED`,
            // The message, never the stack. Stacks belong in stdout (they are diagnostic
            // detail for developers); the audit trail stores the business-readable reason.
            error_message: error?.message ?? 'Unknown error',
            duration_ms: Date.now() - startedAt,
          });
        },
        // NOTE: `tap` does not swallow the error — it rethrows automatically, so
        // AllExceptionsFilter still runs and the client still gets its proper error response.
      }),
    );
  }

  // ========================================== 2. Private Helpers & Utilities ==========================================

  /**
   * Decides whether a request deserves an audit record.
   * Mutating verbs always qualify; a GET only qualifies if the route opted in explicitly.
   */
  private shouldAudit(method: string, options: AuditOptions): boolean {
    if (AuditInterceptor.MUTATING_METHODS.includes(method.toUpperCase())) {
      return true;
    }
    // A read is audited only when deliberately requested — e.g. viewing sensitive personal
    // data, where regulations sometimes require recording access as well as modification.
    return options.action === AuditAction.READ;
  }

  //==============================================================================================

  /** Collects the "who / what / where" facts from the request into an audit payload. */
  private captureRequestSnapshot(request: RequestWithContext, options: AuditOptions) {
    const action = options.action ?? this.resolveAction(request.method);
    const resource = options.resource ?? this.resolveResource(request);
    const resourceId = this.resolveResourceIdFromParams(request);

    // `captureBody` defaults to true; a route can disable it for huge payloads.
    const shouldCaptureBody = options.captureBody !== false;

    return {
      // --- WHO / WHERE ---
      // buildAuditContext handles the ANONYMOUS fallback: on a @Public() route (login,
      // register) there is no `request.user`, and we record the action anyway rather than
      // drop it — a failed login attempt is precisely what we must not lose (docs §1.8.5).
      // It also supplies ip_address, user_agent, http_method, endpoint and request_id, the
      // last being the join key to the throwaway stdout lines for the same request.
      ...buildAuditContext(request),

      // --- WHAT ---
      action,
      resource,
      resource_id: resourceId,
      description: options.description ?? `${action} ${resource}${resourceId ? ` (${resourceId})` : ''}`,

      // The interceptor cannot know the previous state (see the class doc), so `before_state`
      // stays null here and is filled only by explicit service-level audit calls.
      before_state: null,
      after_state: shouldCaptureBody ? this.redact(request.body) : null,
    };
  }

  //==============================================================================================

  /** Maps an HTTP verb to the default audit action. */
  private resolveAction(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PATCH':
      case 'PUT':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }

  //==============================================================================================

  /**
   * Infers the resource from the first segment of the URL.
   *
   * This is a best-effort fallback so that a brand-new module is never recorded as UNKNOWN
   * just because nobody added an @Audit() decorator. When you add a module whose route prefix
   * is not in this map, add it here (and to AuditResource) — or simply decorate the controller.
   */
  private resolveResource(request: RequestWithContext): AuditResource {
    const path = (request.route?.path ?? request.originalUrl ?? '').toLowerCase();
    const firstSegment = path.split('?')[0].split('/').filter(Boolean)[0] ?? '';

    const routeToResource: Record<string, AuditResource> = {
      user: AuditResource.USER,
      users: AuditResource.USER,
      auth: AuditResource.AUTH,
      category: AuditResource.CATEGORY,
      'sub-category': AuditResource.SUBCATEGORY,
      subcategory: AuditResource.SUBCATEGORY,
      product: AuditResource.PRODUCT,
      'product-item': AuditResource.PRODUCT_ITEM,
      product_item: AuditResource.PRODUCT_ITEM,
      stock: AuditResource.STOCK,
      order: AuditResource.ORDER,
      orders: AuditResource.ORDER,
    };

    return routeToResource[firstSegment] ?? AuditResource.UNKNOWN;
  }

  //==============================================================================================

  /**
   * Pulls the target id from the route params (`/category/:id` → the id).
   *
   * Express 5 types a param as `string | string[]` because a wildcard or repeated segment can
   * match multiple values. We only ever want a single id, so a non-string is normalised to
   * its first element rather than being stored as an array the schema would reject.
   */
  private resolveResourceIdFromParams(request: RequestWithContext): string | null {
    const params = request.params ?? {};
    const candidate = params.id ?? params._id ?? null;

    if (Array.isArray(candidate)) {
      return candidate[0] ?? null;
    }

    return candidate;
  }

  //==============================================================================================

  /**
   * Pulls an id out of the handler's response — needed for CREATE, where the id did not exist
   * when the request arrived. Defensive about shape because handlers return documents, plain
   * objects, `{ message }`, or arrays.
   */
  private extractResourceId(responseBody: any): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }
    const candidate = responseBody._id ?? responseBody.id ?? responseBody?.data?._id;
    return candidate ? String(candidate) : null;
  }

  //==============================================================================================

  /**
   * Returns a deep copy of `payload` with every sensitive field replaced by '[REDACTED]'.
   *
   * Two non-obvious requirements drive this implementation:
   *
   *  1. It must be a COPY. Redacting in place would mutate `request.body`, and the controller
   *     would then receive '[REDACTED]' as the user's actual password. The audit system must
   *     never alter the data it observes.
   *
   *  2. It must RECURSE, because secrets nest: `{ user: { credentials: { password: '...' } } }`.
   *     A shallow key check would miss that entirely.
   *
   * `depth` guards against a cyclic or pathologically deep object turning redaction into a
   * stack overflow — which would take down the request it was only supposed to observe.
   */
  private redact(payload: any, depth = 0): Record<string, any> | null {
    if (payload === null || payload === undefined) {
      return null;
    }

    // Step 1: Stop descending at a sane depth. Anything deeper is summarised, not traversed.
    if (depth > 6) {
      return { _truncated: 'max depth reached' };
    }

    // Step 2: Primitives are returned as-is (reached via recursion on arrays/objects).
    if (typeof payload !== 'object') {
      return payload;
    }

    // Step 3: Arrays — map element-wise, preserving order.
    if (Array.isArray(payload)) {
      return payload.map((item) => this.redact(item, depth + 1)) as any;
    }

    // Step 4: Objects — copy key by key, redacting matches and recursing into the rest.
    const redacted: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
      const isSensitive = AuditInterceptor.SENSITIVE_FIELDS.some((field) => key.toLowerCase() === field.toLowerCase());

      if (isSensitive) {
        // We record that the field was PRESENT but not its value. Knowing a password-change
        // request included a new password is useful; knowing the password is a liability.
        redacted[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        redacted[key] = this.redact(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}