/**
 * @file audit_action.enum.ts
 * @description Controlled vocabulary for the "WHAT did they do" part of an audit record.
 */

/**
 * Why an enum instead of a free-text string?
 *
 * An audit trail is only useful if it is QUERYABLE. If every developer writes their own
 * wording ('delete', 'deleted', 'DELETE', 'removed'), then the question "show me every
 * deletion last month" becomes impossible to answer reliably. A fixed vocabulary keeps
 * the collection consistent forever.
 *
 * Note that both CRUD actions AND security events live here — failed logins are among the
 * most valuable entries an audit trail can hold.
 */
export enum AuditAction {
  // --- Standard data mutations (mapped automatically from HTTP verbs by AuditInterceptor) ---
  CREATE = 'CREATE',
  READ = 'READ', // only audited deliberately; normal GETs are NOT recorded (see docs §1.7)
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // --- Domain-specific business actions (recorded via explicit service calls) ---
  TOGGLE_STATUS = 'TOGGLE_STATUS', // activating / deactivating a catalog record
  STOCK_ADJUST = 'STOCK_ADJUST',
  STOCK_DEDUCT = 'STOCK_DEDUCT',
  PRICE_CHANGE = 'PRICE_CHANGE',
  PERMISSION_GRANT = 'PERMISSION_GRANT', // an admin widening someone's access
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',

  // --- Authentication & security events ---
  //
  // NOTE: there is intentionally no separate LOGIN_FAILED value. A failed login is recorded
  // as `action: LOGIN` with `status: FAILURE`, exactly like every other failed action in the
  // system. Having two ways to express the same fact is precisely what a controlled
  // vocabulary exists to prevent — you would have to remember to query for both, and sooner
  // or later someone would not. To find brute-force attempts:
  //     GET /audit-log?action=LOGIN&status=FAILURE
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR_SETUP = 'TWO_FACTOR_SETUP',
  ACCESS_DENIED = 'ACCESS_DENIED', // a 401/403 — someone probing endpoints they cannot use
}