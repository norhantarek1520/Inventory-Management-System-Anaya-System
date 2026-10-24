/**
 * @file request_with_context.interface.ts
 * @description Express Request enriched with the per-request logging context that
 *              CorrelationIdMiddleware attaches.
 */

import { Request } from 'express';
import { AuthenticatedUser } from './authenticated_user.interface';

/**
 * Middlewares, guards and interceptors all need to read fields that Express itself
 * knows nothing about. Rather than casting to `any` at every call site (which silently
 * hides typos like `req.requstId`), we declare the enriched shape once and type against it.
 */
export interface RequestWithContext extends Request {
  /** Unique id for this single HTTP request — set by CorrelationIdMiddleware. */
  requestId?: string;

  /** High-resolution start time (ms) used to compute request duration. */
  startTime?: number;

  /** Populated by JwtAuthGuard / Passport. Absent on @Public() routes. */
  user?: AuthenticatedUser;

  /**
   * Set to true by AuditInterceptor once it has taken responsibility for this request.
   *
   * It exists to stop double-recording. AllExceptionsFilter also writes audit records, but
   * only for 401/403 denials — which guards reject before any interceptor runs, so they would
   * otherwise be invisible to the trail entirely. This flag is how the filter distinguishes
   * "the interceptor never saw this" from "the interceptor already recorded it".
   */
  auditHandled?: boolean;
}