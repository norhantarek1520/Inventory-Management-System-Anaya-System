/**
 * @file audit_log.schema.ts
 * @description The `audit_logs` collection — the permanent, append-only "who / when / what"
 *              trail for every state-changing action in the IMS.
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction, AuditResource, AuditStatus } from '../enums';

export type AuditLogDocument = AuditLog & Document;

/**
 * Design notes — why this schema looks the way it does:
 *
 * 1. `timestamps: true` gives us `createdAt`, which IS the "WHEN". We never need `updatedAt`
 *    semantically (records are never updated) but it costs nothing and keeps the schema
 *    consistent with the rest of the codebase.
 *
 * 2. The actor is stored BOTH as a reference (`actor_id`) and as a flat snapshot
 *    (`actor_email`, `actor_role`). That duplication is intentional, not sloppiness:
 *    if a user is later deleted or demoted, a reference-only record would silently change
 *    meaning when populated. An audit record must stay true to the moment it describes,
 *    so we freeze the identity as plain strings at write time.
 *
 * 3. `before_state` / `after_state` are untyped `Object`. "Ahmed updated P0045" is almost
 *    useless; "Ahmed changed P0045.price 50 → 500" settles a dispute. Mixed type is the
 *    right call here because this collection holds the diff of EVERY entity in the system.
 */
@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  // ========================================== 1. WHO ==========================================

  /**
   * Reference to the acting user. Nullable on purpose: failed logins, seeders and cron jobs
   * are all audit-worthy but have no authenticated user. We record them with a null actor_id
   * rather than dropping the record.
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  actor_id?: Types.ObjectId | null;

  /** Frozen identity snapshot — 'ANONYMOUS' for unauthenticated, 'SYSTEM' for internal jobs. */
  @Prop({ required: true, trim: true, default: 'ANONYMOUS' })
  actor_email: string;

  /** The role the actor held AT THE TIME of the action (may differ from their role today). */
  @Prop({ required: false, trim: true, default: null })
  actor_role?: string | null;

  // ========================================== 2. WHAT ==========================================

  @Prop({ required: true, type: String, enum: Object.values(AuditAction), index: true })
  action: AuditAction;

  @Prop({ required: true, type: String, enum: Object.values(AuditResource), default: AuditResource.UNKNOWN, index: true })
  resource: AuditResource;

  /** The id of the specific record touched. Stored as a string so it also fits codes like 'C001'. */
  @Prop({ required: false, trim: true, default: null })
  resource_id?: string | null;

  /** Short human-readable sentence, e.g. "Deleted category C012 (Beverages)". */
  @Prop({ required: true, trim: true, maxlength: 500 })
  description: string;

  // ========================================== 3. CHANGE DETAIL ==========================================

  /** Entity state before the mutation. Only populated by explicit service-level audit calls. */
  @Prop({ type: Object, required: false, default: null })
  before_state?: Record<string, any> | null;

  /** Entity state after the mutation, or the (redacted) request body for interceptor-captured records. */
  @Prop({ type: Object, required: false, default: null })
  after_state?: Record<string, any> | null;

  // ========================================== 4. OUTCOME ==========================================

  @Prop({ required: true, type: String, enum: Object.values(AuditStatus), default: AuditStatus.SUCCESS, index: true })
  status: AuditStatus;

  /** Populated only when status is FAILURE — the rejection reason / exception message. */
  @Prop({ required: false, trim: true, maxlength: 1000, default: null })
  error_message?: string | null;

  // ========================================== 5. REQUEST CONTEXT ==========================================

  /**
   * IP + user-agent are what let you spot "this account acted from Cairo and Berlin
   * two minutes apart" — an identity signal the userId alone can never give you.
   */
  @Prop({ required: false, trim: true, default: null })
  ip_address?: string | null;

  @Prop({ required: false, trim: true, maxlength: 500, default: null })
  user_agent?: string | null;

  @Prop({ required: false, trim: true, default: null })
  http_method?: string | null;

  @Prop({ required: false, trim: true, default: null })
  endpoint?: string | null;

  /**
   * The correlation id assigned by CorrelationIdMiddleware. This is the join key between
   * this permanent audit record and the throwaway console/stdout lines for the same request —
   * the bridge between the two halves of "logging" (see docs §1.2).
   */
  @Prop({ required: false, trim: true, default: null, index: true })
  request_id?: string | null;

  /** Handler execution time in milliseconds — doubles as a cheap performance signal. */
  @Prop({ required: false, type: Number, default: null })
  duration_ms?: number | null;

  // ========================================== 6. Timestamps ==========================================

  /**
   * `createdAt` IS the "WHEN" of the audit record, and `timestamps: true` above already
   * creates both of these paths in Mongo.
   *
   * They are declared here WITHOUT @Prop on purpose. SchemaFactory only reads @Prop metadata,
   * so a bare class property adds nothing to the schema — but it does add the field to the
   * TypeScript type. That is what makes `filter.createdAt = { $gte: ... }` type-check against
   * Mongoose 9's `QueryFilter`, which is strict and rejects any key not present on the type.
   */
  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

/**
 * Indexes follow the ONLY two questions this collection ever gets asked:
 *   1. "What did user X do?"            → (actor_id, createdAt desc)
 *   2. "What happened to resource Y?"   → (resource, resource_id, createdAt desc)
 * Both are compound and both end in `createdAt: -1`, because the answer is always
 * "most recent first". Without these, every audit query becomes a full collection scan —
 * and this is the one collection that only ever grows.
 */
AuditLogSchema.index({ actor_id: 1, createdAt: -1 });
AuditLogSchema.index({ resource: 1, resource_id: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

/**
 * RETENTION (intentionally left disabled):
 * A TTL index would auto-delete records after N seconds. Do NOT enable one until the
 * business has confirmed a legal retention period — silently deleting an audit trail is
 * itself a compliance failure.
 *
 *   AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 }); // 2 years
 */