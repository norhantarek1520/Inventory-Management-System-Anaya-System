/**
 * @file audit_resource.enum.ts
 * @description Controlled vocabulary for "WHICH entity was acted upon" in an audit record.
 */

/**
 * The resource answers: the user performed a DELETE — on what kind of thing?
 *
 * Paired with `resource_id` on the schema, this gives the full target of an action:
 *   resource = CATEGORY, resource_id = '68f2...b1'  →  "category 68f2...b1"
 *
 * The string values intentionally match the first segment of the route paths
 * (`/category`, `/product-item`, ...) so AuditInterceptor can infer them automatically
 * for any route that did not declare @Audit() explicitly.
 */
export enum AuditResource {
  USER = 'USER',
  AUTH = 'AUTH',
  CATEGORY = 'CATEGORY',
  SUBCATEGORY = 'SUBCATEGORY',
  PRODUCT = 'PRODUCT',
  PRODUCT_ITEM = 'PRODUCT_ITEM',
  STOCK = 'STOCK',
  ORDER = 'ORDER',
  SYSTEM = 'SYSTEM', // seeders, cron jobs, settings changes — anything not user-owned
  UNKNOWN = 'UNKNOWN', // fallback so a record is never dropped just because we can't classify it
}