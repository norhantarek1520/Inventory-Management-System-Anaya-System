/**
 * @file audit_log.service.ts
 * @description APPROACH B — the write/read API for the permanent audit trail.
 *              Deliberately append-only: there is no update() and no remove().
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// `QueryFilter` is the Mongoose 9 name for what used to be `FilterQuery` in v8 and earlier.
// It is also strict now: any key used in a filter must exist on the document type, which is
// why AuditLog declares `createdAt` explicitly.
import { Model, QueryFilter, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from 'src/commons/schema';
import { AuditLogPayload, AuditResource, AuditStatus, GetAuditLogQueryDto } from 'src/commons';

@Injectable()
export class AuditLogService {
  /**
   * Note the irony worth understanding: the AUDIT service uses the OPERATIONAL logger.
   * They are different systems with different jobs (docs §1.2). When writing to the audit
   * trail fails, that failure is a developer/infrastructure problem — so it belongs in
   * stdout, not in the trail we just failed to write to.
   */
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>) {}

  // ========================================== 1. Write (append-only) ==========================================

  /**
   * Appends one record to the trail.
   *
   * THE MOST IMPORTANT PROPERTY OF THIS METHOD IS THAT IT NEVER THROWS.
   *
   * Consider the alternative. A user creates a category; the category saves fine; then the
   * audit write fails (Mongo hiccup, validation slip, disk full). If this method threw, the
   * exception would propagate out of the interceptor and the user would get a 500 for an
   * operation that actually SUCCEEDED. Their data is saved but they are told it failed, so
   * they retry and create a duplicate.
   *
   * An audit system that can break business logic is worse than no audit system. So every
   * failure here is swallowed and redirected to the operational logger, where an alert can
   * pick it up without the user ever noticing.
   *
   * The trade-off is explicit and worth stating plainly: we chose availability over
   * guaranteed capture. In a regulated environment where a missing record is unacceptable,
   * you would instead push the payload onto a durable queue and retry — but you still would
   * not fail the user's request inline.
   */
  public async record(payload: AuditLogPayload): Promise<void> {
    try {
      // Step 1: Normalise the actor. Unauthenticated requests (a failed login) and internal
      // jobs (seeders, cron) are still audit-worthy, so we label them rather than skip them.
      const auditRecord = new this.auditLogModel({
        actor_id: payload.actor_id ? new Types.ObjectId(payload.actor_id) : null,
        actor_email: payload.actor_email ?? 'ANONYMOUS',
        actor_role: payload.actor_role ?? null,

        // Step 2: The WHAT.
        action: payload.action,
        resource: payload.resource,
        resource_id: payload.resource_id ?? null,
        description: payload.description,

        // Step 3: The change detail (only explicit service calls can supply before_state).
        before_state: payload.before_state ?? null,
        after_state: payload.after_state ?? null,

        // Step 4: The outcome — defaults to SUCCESS when the caller did not say.
        status: payload.status ?? AuditStatus.SUCCESS,
        error_message: payload.error_message ?? null,

        // Step 5: Request context for forensics.
        ip_address: payload.ip_address ?? null,
        user_agent: payload.user_agent ?? null,
        http_method: payload.http_method ?? null,
        endpoint: payload.endpoint ?? null,
        request_id: payload.request_id ?? null,
        // Prefer an explicitly measured duration (AuditInterceptor passes one). Otherwise
        // derive it from the request start time, so records written by a service or by the
        // exception filter are not stuck with a null in a column that other rows populate.
        duration_ms: payload.duration_ms ?? (payload.started_at ? Date.now() - payload.started_at : null),
      });

      // Step 6: Persist. `createdAt` ("WHEN") is stamped by Mongoose — never passed in by a
      // caller, so the recorded time cannot be forged or accidentally mis-set.
      await auditRecord.save();

      this.logger.debug(`Audit recorded: ${payload.action} ${payload.resource} by ${payload.actor_email ?? 'ANONYMOUS'}`);
    } catch (error) {
      // Swallow deliberately — see the method doc above.
      this.logger.error(`FAILED to write audit record (${payload.action} ${payload.resource}): ${error?.message}`, error?.stack);
    }
  }

  // ========================================== 2. Read ==========================================

  /**
   * Queries the trail with filters + pagination.
   * Returns the page plus total/page metadata, because an audit viewer UI is useless without
   * a total count to build its pager from.
   */
  public async findAll(getAuditLogQueryDto?: GetAuditLogQueryDto) {
    const filter: QueryFilter<AuditLogDocument> = {};
    const dto = getAuditLogQueryDto ?? ({} as GetAuditLogQueryDto);

    // Step 1: WHO filters.
    if (dto.actor_id) {
      filter.actor_id = new Types.ObjectId(dto.actor_id);
    }
    if (dto.actor_email) {
      // Escaped before use in a regex — see escapeRegex() for why that matters here.
      filter.actor_email = { $regex: this.escapeRegex(dto.actor_email), $options: 'i' };
    }

    // Step 2: WHAT filters — all exact matches on indexed enum fields.
    if (dto.action) {
      filter.action = dto.action;
    }
    if (dto.resource) {
      filter.resource = dto.resource;
    }
    if (dto.resource_id) {
      filter.resource_id = dto.resource_id;
    }
    if (dto.status) {
      filter.status = dto.status;
    }
    if (dto.request_id) {
      filter.request_id = dto.request_id;
    }

    // Step 3: WHEN filter — a date range on createdAt.
    // Both bounds are optional and combined into one object so that passing only `from_date`
    // or only `to_date` both work, as does passing both.
    if (dto.from_date || dto.to_date) {
      filter.createdAt = {};
      if (dto.from_date) {
        (filter.createdAt as any).$gte = new Date(dto.from_date);
      }
      if (dto.to_date) {
        (filter.createdAt as any).$lte = new Date(dto.to_date);
      }
    }

    // Step 4: Pagination.
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // Step 5: Run the page query and the count in parallel — they are independent, so there is
    // no reason to pay for them sequentially.
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 }) // newest first; matches the compound indexes on the schema
        .skip(skip)
        .limit(limit)
        .lean() // plain objects: we only read these, never mutate or re-save them
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    this.logger.log(`Audit query returned ${data.length}/${total} records (page ${page})`);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  //==============================================================================================

  /** Fetches one record — used to inspect a single entry's full before/after state. */
  public async findOne(id: string): Promise<AuditLog> {
    const auditRecord = await this.auditLogModel.findById(id).lean().exec();

    if (!auditRecord) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return auditRecord as AuditLog;
  }

  //==============================================================================================

  /**
   * Convenience read: the full history of one entity, oldest-to-newest.
   * This is what a "History" tab on a category/product detail page calls.
   */
  public async findResourceHistory(resource: AuditResource, resourceId: string): Promise<AuditLog[]> {
    return (await this.auditLogModel
      .find({ resource, resource_id: resourceId })
      .sort({ createdAt: 1 }) // ascending here: a history timeline reads forward in time
      .lean()
      .exec()) as AuditLog[];
  }

  // ========================================== 3. Intentionally absent ==========================================
  //
  // There is no update() and no remove() on this service, and that is a design decision, not
  // an oversight (docs §1.8.1).
  //
  // An audit trail that can be edited proves nothing — the first thing anyone covering their
  // tracks does is edit the log. Not exposing the capability in code is the cheapest possible
  // enforcement. In production, back it up at the database layer too, by giving the
  // application's Mongo user insert+find rights on `audit_logs` but not update or delete.

  // ========================================== 4. Private Helpers & Utilities ==========================================

  /**
   * Escapes regex metacharacters in user-supplied search input.
   *
   * Without this, a search for `a.*` would match every email, and input like `(((` would make
   * Mongo throw on an invalid pattern. A pathological pattern can also cause catastrophic
   * backtracking — a denial-of-service via a search box. Escaping turns the input back into
   * the literal substring the user meant.
   */
  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}