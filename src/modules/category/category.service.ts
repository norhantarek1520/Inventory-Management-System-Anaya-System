/**
 * @file category.service.ts
 * @description Category CRUD. Also serves as the reference example for BOTH logging
 *              approaches: NestJS Logger for operational detail, and explicit
 *              AuditLogService calls for the permanent who/when/what trail.
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from 'src/commons/schema';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoryQueryDto, AuditAction, AuditResource, AuditContextData } from 'src/commons';
import { AuditLogService } from '../audit_log/audit_log.service';

@Injectable()
export class CategoryService {
  /**
   * APPROACH A — one operational logger per class, named after the class.
   * `CategoryService.name` rather than the string 'CategoryService' so a future rename
   * cannot leave a stale, misleading context label in your logs.
   *
   * These lines go to stdout and are disposable. They answer "why did this break?".
   */
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    // APPROACH B — injectable without importing AuditLogModule here, because that module is
    // @Global(). These writes are permanent and answer "who changed this, and when?".
    private readonly auditLogService: AuditLogService,
  ) {}

  // ========================================== 1. Business Methods ==========================================

  /**
   * NOTE ON THE `ctx` PARAMETER, which appears on the mutating methods below.
   *
   * A service has no access to the HTTP request, so it cannot discover the acting user, their
   * IP, or the correlation id by itself. The controller reads all of that with
   * @AuditContext() and passes it down as one object.
   *
   * It is optional so that internal callers (seeders, cron jobs, tests) can still use these
   * methods — they just produce a record with a SYSTEM/ANONYMOUS actor and no request context.
   *
   * EXACTLY ONE AUDIT RECORD PER ACTION. The routes whose services make an explicit call are
   * marked @NoAudit() in the controller, so the global interceptor stands down for them. This
   * matters: an earlier version let both fire, and every update produced TWO rows — one with
   * the before/after diff but no IP or request id, and one with the request context but no
   * diff. Two half-complete rows for one event is worse than either alone, because now a
   * reviewer has to know to correlate them. Passing `ctx` down is what makes the single
   * explicit record complete in both dimensions.
   *
   * `create` below is the opposite case: it relies on the global interceptor ALONE and takes
   * no ctx. On a create there is no previous state to diff, so the automatic record already
   * captures everything of value. Explicit calls are reserved for methods that know something
   * the HTTP layer cannot see.
   */
  public async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      // Step 1: Log the attempt. `debug` level, because on a healthy system this is noise —
      // it only matters while actively tracing a problem, so production filters it out.
      this.logger.debug(`Step 1: Creating category ${createCategoryDto.category_code} (${createCategoryDto.name})`);

      const createdCategory = new this.categoryModel(createCategoryDto);
      const saved = await createdCategory.save();

      // Step 2: Log success at `log` level — a real business event, kept in production.
      this.logger.log(`Category created: ${saved.category_code} (id: ${saved._id})`);

      // Step 3: No explicit audit call needed — AuditInterceptor already recorded this POST
      // with the actor, the redacted body, the IP and the outcome.
      return saved;
    } catch (error) {
      // Step 4: `warn`, not `error`, for the common case. A duplicate category_code is a
      // caller mistake (Mongo error 11000), not a server fault. Logging it as an error would
      // pollute the error channel with non-problems until nobody trusts it any more.
      if (error?.code === 11000) {
        this.logger.warn(`Duplicate key rejected for category ${createCategoryDto.category_code}: ${JSON.stringify(error.keyValue)}`);
      } else {
        this.logger.error(`Failed to create category ${createCategoryDto.category_code}: ${error?.message}`, error?.stack);
      }
      throw error;
    }
  }
  //==============================================================================================

  public async findAll(getCategoryQueryDto?: GetCategoryQueryDto): Promise<Category[]> {
    const filter: any = {};

    if (getCategoryQueryDto) {
      // 1. Filter by active/inactive status if provided
      if (getCategoryQueryDto.is_active !== undefined) {
        filter.is_active = getCategoryQueryDto.is_active;
      }

      // 2. Filter by search keyword matching name or category_code (case-insensitive)
      if (getCategoryQueryDto.search) {
        filter.$or = [
          { name: { $regex: getCategoryQueryDto.search, $options: 'i' } },
          { category_code: { $regex: getCategoryQueryDto.search, $options: 'i' } },
        ];
      }
    }

    // 3. Handle Pagination calculations (defaults to page 1, limit 10 via DTO properties)
    const page = getCategoryQueryDto?.page ?? 1;
    const limit = getCategoryQueryDto?.limit ?? 10;
    const skip = (page - 1) * limit;

    // 4. Operational logging only — a list read is NOT written to the audit trail.
    // Recording every category-list view would multiply the audit collection many times over
    // while telling a business reader nothing (docs §1.7). `verbose` because dumping the
    // constructed Mongo filter is useful only while debugging a query.
    this.logger.verbose(`Querying categories with filter ${JSON.stringify(filter)} (page ${page}, limit ${limit})`);

    return await this.categoryModel.find(filter).skip(skip).limit(limit).exec();
  }
  //==============================================================================================

  public async findOne(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      // A 404 is normal traffic, so `warn` — never `error`. See the same reasoning in
      // AllExceptionsFilter.
      this.logger.warn(`Category lookup failed — ID ${id} not found`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }
  //==============================================================================================

  /**
   * UPDATE — the clearest demonstration of why explicit audit calls exist.
   *
   * The global interceptor would record "user X performed UPDATE on CATEGORY abc123". True,
   * but nearly useless six months later when someone asks why a category was renamed.
   *
   * By reading the document BEFORE writing, we can record the actual diff:
   *   before: { name: 'Drinks',    is_active: true }
   *   after:  { name: 'Beverages', is_active: true }
   *
   * That is the entry that settles a dispute. The HTTP layer physically cannot produce it —
   * by the time an interceptor sees the response, the old value is gone (docs §1.8.4).
   */
  public async update(id: string, updateCategoryDto: UpdateCategoryDto, ctx?: AuditContextData): Promise<Category> {
    // Step 1: Capture the BEFORE state. `.lean()` gives a plain object, so it is a true
    // snapshot — a live Mongoose document would be mutated by the update and we would end up
    // storing the new values in both before_state and after_state.
    const existingCategory = await this.categoryModel.findById(id).lean().exec();

    if (!existingCategory) {
      this.logger.warn(`Update rejected — category ID ${id} not found`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.debug(`Step 1: Updating category ${existingCategory.category_code} with ${JSON.stringify(updateCategoryDto)}`);

    // Step 2: Apply the update.
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true, runValidators: true }).exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Step 3: Operational log.
    this.logger.log(`Category updated: ${updatedCategory.category_code} (id: ${id})`);

    // Step 4: Permanent audit record with the diff.
    //
    // We only store the fields that ACTUALLY changed, not the whole document twice. Two
    // reasons: storage (this collection only grows), and readability — a reviewer should see
    // the three fields that changed, not scan 20 identical ones to find them.
    const changedFields = this.extractChangedFields(existingCategory, updatedCategory.toObject());

    // Not awaited on purpose. `record()` never throws (it swallows its own failures), and the
    // user's response should not wait on an audit write. Fire-and-forget is safe here
    // precisely because of that guarantee.
    void this.auditLogService.record({
      // Spreads actor_id / actor_email / actor_role AND the request context
      // (ip_address, user_agent, http_method, endpoint, request_id) in one go.
      ...ctx,
      action: AuditAction.UPDATE,
      resource: AuditResource.CATEGORY,
      resource_id: id,
      description: `Updated category ${existingCategory.category_code} (${existingCategory.name}) — changed: ${Object.keys(changedFields.before).join(', ') || 'none'}`,
      before_state: changedFields.before,
      after_state: changedFields.after,
    });

    return updatedCategory;
  }
  //==============================================================================================

  /**
   * DELETE — the single highest-value audit record in any system.
   *
   * After a delete the row is gone from `categories`, so the audit record is the ONLY
   * remaining evidence that it ever existed. We therefore store the ENTIRE document as
   * `before_state`, not just a diff: this record doubles as the recovery source if the
   * deletion turns out to have been a mistake.
   */
  public async remove(id: string, ctx?: AuditContextData): Promise<{ message: string }> {
    // Step 1: Read the full document before destroying it.
    const existingCategory = await this.categoryModel.findById(id).lean().exec();

    if (!existingCategory) {
      this.logger.warn(`Delete rejected — category ID ${id} not found`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.debug(`Step 1: Deleting category ${existingCategory.category_code} (${existingCategory.name})`);

    // Step 2: Delete.
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Step 3: Deletions are logged at `warn` even on success. They are irreversible, so they
    // deserve to stand out when skimming logs — the level here signals "pay attention",
    // not "something broke".
    this.logger.warn(`Category DELETED: ${existingCategory.category_code} (${existingCategory.name}) by ${ctx?.actor_email ?? 'SYSTEM'}`);

    // Step 4: Permanent record, with the whole document preserved.
    void this.auditLogService.record({
      // Spreads actor_id / actor_email / actor_role AND the request context
      // (ip_address, user_agent, http_method, endpoint, request_id) in one go.
      ...ctx,
      action: AuditAction.DELETE,
      resource: AuditResource.CATEGORY,
      resource_id: id,
      description: `Deleted category ${existingCategory.category_code} (${existingCategory.name})`,
      before_state: existingCategory, // full snapshot — the only surviving copy
      after_state: null, // null means "no longer exists"
    });

    return { message: 'Category successfully deleted' };
  }
  //==============================================================================================

  /**
   * TOGGLE STATUS — a domain action, not a generic UPDATE.
   *
   * The interceptor can only infer UPDATE from the PATCH verb. Recording it as
   * TOGGLE_STATUS instead makes the trail answerable to a real business question:
   * "who deactivated this category, and when?" — a query you cannot run if the action is
   * buried among every other kind of update.
   */
  public async togleStatus(id: string, ctx?: AuditContextData) {
    // Step 1: Read the current status — required both to toggle correctly and to record the
    // before/after pair.
    const existingCategory = await this.categoryModel.findById(id).lean().exec();

    if (!existingCategory) {
      this.logger.warn(`Toggle status rejected — category ID ${id} not found`);
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Step 2: Flip the actual stored value.
    const nextStatus = !existingCategory.is_active;

    this.logger.debug(`Step 2: Toggling category ${existingCategory.category_code} is_active ${existingCategory.is_active} → ${nextStatus}`);

    const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, { is_active: nextStatus }, { new: true, runValidators: true }).exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Step 3: Operational log.
    this.logger.log(`Category ${updatedCategory.category_code} status set to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}`);

    // Step 4: Permanent record with the specific business action name.
    void this.auditLogService.record({
      // Spreads actor_id / actor_email / actor_role AND the request context
      // (ip_address, user_agent, http_method, endpoint, request_id) in one go.
      ...ctx,
      action: AuditAction.TOGGLE_STATUS,
      resource: AuditResource.CATEGORY,
      resource_id: id,
      description: `${nextStatus ? 'Activated' : 'Deactivated'} category ${existingCategory.category_code} (${existingCategory.name})`,
      before_state: { is_active: existingCategory.is_active },
      after_state: { is_active: nextStatus },
    });

    return updatedCategory;
  }
  //==============================================================================================
  //========================================== Private helper funcions====================================================

  /**
   * Reduces two document snapshots to only the fields that differ, returning parallel
   * before/after objects.
   *
   * Why bother instead of storing both full documents? The audit collection is the one that
   * grows without bound, and a reviewer opening a record wants to see the two fields that
   * changed — not hunt for them among twenty identical ones.
   *
   * Comparison is by JSON string rather than `!==` so that nested objects and arrays (e.g.
   * `sub_category_ids`) compare by VALUE. Reference equality would mark every array as
   * changed on every single update.
   */
  private extractChangedFields(before: Record<string, any>, after: Record<string, any>) {
    const beforeChanges: Record<string, any> = {};
    const afterChanges: Record<string, any> = {};

    // Driven by the keys of `after`: we care about what the update touched. Mongo-managed
    // bookkeeping fields are excluded because they change on every write and would make
    // every record look modified.
    const ignoredKeys = ['_id', '__v', 'createdAt', 'updatedAt'];

    for (const key of Object.keys(after)) {
      if (ignoredKeys.includes(key)) {
        continue;
      }

      if (JSON.stringify(before?.[key]) !== JSON.stringify(after[key])) {
        beforeChanges[key] = before?.[key] ?? null;
        afterChanges[key] = after[key];
      }
    }

    return { before: beforeChanges, after: afterChanges };
  }
}
