/**
 * @file audit_context.interface.ts
 * @description The per-request "who / where" facts, in exactly the shape AuditLogPayload
 *              expects so it can be spread straight into an audit record.
 */

/**
 * WHY THIS TYPE EXISTS.
 *
 * A service cannot see the HTTP request, so it cannot discover the acting user, their IP, or
 * the correlation id by itself. Before this type, the only thing passed down was the actor —
 * which meant explicit audit records came out with `ip_address: null` and `request_id: null`,
 * and therefore could not be joined to the operational logs for the same request.
 *
 * The field names deliberately match AuditLogPayload exactly, so a service can write:
 *
 *   this.auditLogService.record({ ...ctx, action, resource, before_state, after_state });
 *
 * and get a record that is complete in both dimensions — business detail AND request context.
 */
export interface AuditContextData {
  actor_id: string | null;
  actor_email: string;
  actor_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  http_method: string | null;
  endpoint: string | null;
  request_id: string | null;

  /**
   * When the request started (ms epoch), copied from `request.startTime`.
   *
   * This field is NOT persisted. It exists so AuditLogService.record() can derive
   * `duration_ms` for callers that cannot measure it themselves — a service has no idea how
   * long the request has been running, and before this, every service-written record had a
   * null duration while interceptor-written ones had a real number. Inconsistent nulls in one
   * column are worse than no column: you cannot tell "fast" from "not measured".
   *
   * The derived value is elapsed time up to the moment the record is WRITTEN, not full
   * request duration (the response has not been sent yet) — close enough to be useful for
   * spotting slow operations, and the distinction is why the interceptor still passes its own
   * more precise `duration_ms`, which takes precedence.
   */
  started_at?: number | null;
}
