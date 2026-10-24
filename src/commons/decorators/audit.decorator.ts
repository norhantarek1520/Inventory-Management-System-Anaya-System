/**
 * @file audit.decorator.ts
 * @description APPROACH B — route-level metadata telling AuditInterceptor what to record.
 */

import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditResource } from '../enums';

export const AUDIT_KEY = 'audit_metadata';
export const NO_AUDIT_KEY = 'audit_skip';

/**
 * Options you can attach to a route with @Audit({...}).
 * Every field is optional — the interceptor infers sensible values from the HTTP method
 * and route path when they are omitted (see AuditInterceptor.resolveAction / resolveResource).
 */
export interface AuditOptions {
  /** Override the inferred action, e.g. TOGGLE_STATUS instead of a generic UPDATE. */
  action?: AuditAction;

  /** Override the inferred resource. Worth setting whenever the route path is not obvious. */
  resource?: AuditResource;

  /** Human-readable sentence for the trail. Falls back to "<ACTION> <RESOURCE>". */
  description?: string;

  /**
   * Persist the (redacted) request body as `after_state`. Default true.
   * Set false for large payloads — e.g. a bulk import of 5,000 rows, where storing the body
   * on every audit record would bloat the collection for little investigative value.
   */
  captureBody?: boolean;
}

/**
 * Labels a route for the audit trail.
 *
 * IMPORTANT: this decorator is NOT what switches auditing on. AuditInterceptor is global and
 * already records every POST/PATCH/PUT/DELETE whether or not it is decorated. That default-on
 * design is deliberate: coverage must not depend on a developer remembering to annotate a new
 * module. @Audit() only IMPROVES an existing record — giving it a precise action name and a
 * readable description instead of the generic inferred ones.
 *
 * @example
 * // Without the decorator you get: action=UPDATE, description="UPDATE CATEGORY"
 * // With it you get a far more searchable record:
 * @Audit({ action: AuditAction.TOGGLE_STATUS, resource: AuditResource.CATEGORY,
 *          description: 'Toggled category active status' })
 * @Patch(':id/toggle-status')
 * async toggleStatus(@Param('id') id: string) { ... }
 */
export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_KEY, options);

/**
 * Opts a route OUT of automatic auditing entirely.
 *
 * Needed for a small number of legitimate cases:
 *   - Endpoints whose payload is too sensitive to persist even after redaction.
 *   - Very high-frequency machine endpoints (e.g. a POS heartbeat) where one audit row per
 *     call would swamp the collection without telling you anything.
 *   - The audit-log read endpoints themselves — otherwise reading the trail writes to the
 *     trail, and a single page view generates noise forever.
 *
 * Use sparingly and with a comment explaining why. Every @NoAudit() is a hole in the trail.
 */
export const NoAudit = () => SetMetadata(NO_AUDIT_KEY, true);