/**
 * @file get_audit_log_query.dto.ts
 * @description Filters for GET /audit-log. These fields ARE the "who / when / what" questions
 *              the audit trail exists to answer.
 */

import { IsString, IsOptional, IsInt, Min, IsEnum, IsMongoId, IsDateString, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditResource, AuditStatus } from '../../enums';

export class GetAuditLogQueryDto {
  // ========================================== 1. WHO ==========================================

  @ApiPropertyOptional({
    example: '68f2a1b9c4d5e6f7a8b9c0d1',
    description: 'Filter by the acting user ObjectId — answers "what did this user do?"',
  })
  @IsMongoId()
  @IsOptional()
  actor_id?: string;

  @ApiPropertyOptional({
    example: 'ahmed@anaya-market.com',
    description: 'Filter by the actor email snapshot (partial, case-insensitive match)',
  })
  @IsString()
  @IsOptional()
  actor_email?: string;

  // ========================================== 2. WHAT ==========================================

  @ApiPropertyOptional({
    enum: AuditAction,
    example: AuditAction.DELETE,
    description: 'Filter by action type — answers "show me every deletion"',
  })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional({
    enum: AuditResource,
    example: AuditResource.CATEGORY,
    description: 'Filter by the kind of entity that was acted upon',
  })
  @IsEnum(AuditResource)
  @IsOptional()
  resource?: AuditResource;

  @ApiPropertyOptional({
    example: '68f2a1b9c4d5e6f7a8b9c0d1',
    description: 'Filter by the specific record id — answers "what happened to THIS category?"',
  })
  @IsString()
  @IsOptional()
  resource_id?: string;

  @ApiPropertyOptional({
    enum: AuditStatus,
    example: AuditStatus.FAILURE,
    description: 'Filter by outcome. FAILURE surfaces rejected/denied attempts.',
  })
  @IsEnum(AuditStatus)
  @IsOptional()
  status?: AuditStatus;

  // ========================================== 3. WHEN ==========================================

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Only return records created on or after this ISO-8601 date (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  from_date?: string;

  @ApiPropertyOptional({
    example: '2026-10-31T23:59:59.000Z',
    description: 'Only return records created on or before this ISO-8601 date (inclusive)',
  })
  @IsDateString()
  @IsOptional()
  to_date?: string;

  // ========================================== 4. TRACING ==========================================

  @ApiPropertyOptional({
    example: 'a1f39c2e-7b40-4e1d-9c2e-5f6a7b8c9d0e',
    description: 'Filter by correlation id — retrieves every record belonging to one request',
  })
  @IsString()
  @IsOptional()
  request_id?: string;

  // ========================================== 5. PAGINATION ==========================================

  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  /**
   * `@Max(200)` is a real safeguard here, not boilerplate. The audit collection is the one
   * that grows without bound, so an unbounded `limit` is an easy way to pull a million
   * documents into memory and take the API down.
   */
  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 200)', default: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}