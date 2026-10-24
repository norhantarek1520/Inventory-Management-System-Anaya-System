/**
 * @file audit_log_payload.interface.ts
 * @description The contract for writing an audit record via AuditLogService.record().
 */

import { AuditAction, AuditResource, AuditStatus } from '../enums';

/**
 * Everything optional except the three fields that define an audit entry:
 * `action` (what), `resource` (on what kind of thing), and `description` (in words).
 * The "when" is never passed in — it is stamped by Mongo via `timestamps: true`,
 * so a caller can never forge or mistake the time of an action.
 */
export interface AuditLogPayload {
  // --- WHO (omit entirely for unauthenticated / system actions) ---
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;

  // --- WHAT (required) ---
  action: AuditAction;
  resource: AuditResource;
  description: string;
  resource_id?: string | null;

  // --- CHANGE DETAIL ---
  before_state?: Record<string, any> | null;
  after_state?: Record<string, any> | null;

  // --- OUTCOME (defaults to SUCCESS when omitted) ---
  status?: AuditStatus;
  error_message?: string | null;

  // --- REQUEST CONTEXT (normally filled in by AuditInterceptor, not by hand) ---
  ip_address?: string | null;
  user_agent?: string | null;
  http_method?: string | null;
  endpoint?: string | null;
  request_id?: string | null;

  /**
   * Explicit duration. When omitted, record() derives one from `started_at` — so a caller
   * that measured the handler precisely (AuditInterceptor) wins, and a caller that cannot
   * (a service, the exception filter) still gets a usable number instead of null.
   */
  duration_ms?: number | null;

  /** Request start time (ms epoch), used only to derive duration_ms. Never persisted. */
  started_at?: number | null;
}