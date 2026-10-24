/**
 * @file audit_log.controller.ts
 * @description APPROACH B — read-only HTTP surface over the audit trail.
 *              There are no write endpoints here, by design.
 */

import { Controller, Get, Param, ParseEnumPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';
import { AuditLogService } from './audit_log.service';
import { GetAuditLogQueryDto, Permissions, Permission, NoAudit, AuditResource } from 'src/commons';

/**
 * THE WHOLE POINT OF PERSISTING TO A DATABASE instead of using console.log is this file.
 *
 * Console output cannot be queried, filtered, paginated or shown to a manager, and it is gone
 * the moment the container restarts. Because the trail lives in MongoDB, it becomes a real
 * feature: an "Activity Log" screen the business can actually use.
 *
 * ACCESS CONTROL IS NOT OPTIONAL HERE. The audit trail is one of the most sensitive
 * collections in the system — it reveals who does what, when, and from which IP. Every
 * endpoint is gated behind the `audit:read` permission (and super_admin bypasses it, per
 * PermissionsGuard). Leaving this open would be worse than having no audit trail at all.
 */
@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-log')
@NoAudit() // ← see the note at the bottom of this file for why the whole controller opts out
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // ========================================== 1. Query the trail ==========================================

  @Get()
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Query the audit trail',
    description:
      'Returns audit records filtered by actor, action, resource, status, date range or request id. ' +
      'Sorted newest-first and paginated. This is the endpoint an "Activity Log" admin screen calls.',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit records plus total/page metadata.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires the audit:read permission.' })
  async findAll(@Query() dto?: GetAuditLogQueryDto) {
    return await this.auditLogService.findAll(dto);
  }

  //==============================================================================================

  /**
   * Declared BEFORE `GET :id`. Express matches routes in registration order, so if `:id` came
   * first it would greedily capture the literal string 'resource' and this endpoint would be
   * unreachable. Static segments must always be registered ahead of dynamic ones.
   */
  @Get('resource/:resource/:resourceId')
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get the full history of one specific record',
    description: 'Oldest-first timeline of everything that ever happened to one entity. Backs a "History" tab on a detail page.',
  })
  @ApiParam({ name: 'resource', enum: AuditResource, description: 'Resource type, e.g. CATEGORY' })
  @ApiParam({ name: 'resourceId', description: 'The id of the specific record' })
  @ApiResponse({ status: 200, description: 'Chronological list of audit records for that entity.' })
  async findResourceHistory(
    // ParseEnumPipe rejects anything outside AuditResource with a 400 before the query runs.
    // Without it, a typo like 'CATEGORYY' would silently return an empty array, which reads
    // as "nothing ever happened to this record" — a dangerously misleading answer from an
    // audit trail.
    @Param('resource', new ParseEnumPipe(AuditResource)) resource: AuditResource,
    @Param('resourceId') resourceId: string,
  ) {
    return await this.auditLogService.findResourceHistory(resource, resourceId);
  }

  //==============================================================================================

  @Get(':id')
  @Permissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Get a single audit record by ID',
    description: 'Returns one record in full, including its before_state / after_state diff.',
  })
  @ApiParam({ name: 'id', description: 'Audit log ObjectId' })
  @ApiResponse({ status: 200, description: 'The audit record.' })
  @ApiResponse({ status: 404, description: 'Audit record not found.' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.auditLogService.findOne(id);
  }

  // ========================================== 2. Intentionally absent ==========================================
  //
  // No POST, PATCH, PUT or DELETE. The trail is append-only and is written ONLY by
  // AuditInterceptor and by explicit service calls — never by an HTTP client. Exposing a
  // write endpoint would let a caller forge history, which destroys the evidentiary value of
  // the entire collection (docs §1.8.1).
  //
  // The class-level @NoAudit() exists for a related reason: without it, every page view of the
  // activity log would itself append records to the activity log. One admin opening the screen
  // would generate entries forever, and the signal would drown in its own noise.
}