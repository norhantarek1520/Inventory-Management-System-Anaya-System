/**
 * @file audit_status.enum.ts
 * @description Outcome of an audited action.
 */

/**
 * Why store the outcome at all?
 *
 * Because "Ahmed ATTEMPTED to delete category C012 and was DENIED" is frequently a more
 * important record than a success. If you only persist successful actions, you are blind
 * to exactly the behaviour you most want to catch: probing, mistakes, and permission abuse.
 */
export enum AuditStatus {
  SUCCESS = 'SUCCESS', // the handler completed and returned normally
  FAILURE = 'FAILURE', // the handler threw — validation error, 404, 403, or a 500
}