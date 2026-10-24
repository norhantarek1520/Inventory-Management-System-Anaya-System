/**
 * @file request_context.util.ts
 * @description Shared helpers for pulling logging/audit context out of an HTTP request.
 */

import { AuditContextData, RequestWithContext } from '../interfaces';

/**
 * Resolves the real client IP.
 *
 * Behind Docker, nginx or a load balancer, `req.ip` is the PROXY's address — useless for
 * identifying a user. The original client sits at the head of `X-Forwarded-For`.
 *
 * SECURITY CAVEAT: X-Forwarded-For is client-supplied and therefore spoofable. It is only
 * trustworthy because a proxy you control is expected to overwrite it. Express's
 * `trust proxy` setting (enabled in main.ts) is what makes `req.ip` itself honour the header
 * for known hops; this function is the fallback for when that is not configured.
 *
 * This lives in one place because three separate consumers need identical behaviour —
 * the access-log middleware, the audit interceptor, and the @AuditContext() decorator.
 * Three copies of it would eventually drift, and then an audit record and its matching log
 * line would disagree about where a request came from.
 */
export function resolveClientIp(request: RequestWithContext): string {
  const forwarded = request.headers?.['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    // The header is a comma-separated chain: "client, proxy1, proxy2". The client is first.
    return forwarded.split(',')[0].trim();
  }

  return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
}

//==============================================================================================

/**
 * Builds the complete who/where context for an audit record from a request.
 *
 * Returns an ANONYMOUS actor rather than throwing when no user is attached. Unauthenticated
 * requests — a failed login, a rejected token — are exactly the events an audit trail must
 * not drop, so there is no code path here that refuses to produce a context.
 */
export function buildAuditContext(request: RequestWithContext): AuditContextData {
  return {
    // `request.user` is populated by JwtAuthGuard. It is absent on @Public() routes.
    actor_id: request.user?.userId ?? null,
    actor_email: request.user?.email ?? 'ANONYMOUS',
    actor_role: request.user?.role ?? null,

    ip_address: resolveClientIp(request),
    // Truncated to respect the schema's maxlength — some bots send enormous UA strings.
    user_agent: (request.get?.('user-agent') ?? '').slice(0, 500) || null,
    http_method: request.method ?? null,
    // `route.path` ('/category/:id') is preferred over `originalUrl` ('/category/68f2...'):
    // the parameterised form is what lets you aggregate "all updates to any category",
    // whereas the concrete URL makes every request look like a distinct endpoint.
    endpoint: request.route?.path ?? request.originalUrl ?? null,
    request_id: request.requestId ?? null,

    // Not persisted — lets AuditLogService.record() derive duration_ms for callers (services,
    // the exception filter) that cannot measure it themselves. See AuditContextData.
    started_at: request.startTime ?? null,
  };
}
