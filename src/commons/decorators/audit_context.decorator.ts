/**
 * @file audit_context.decorator.ts
 * @description Param decorator handing a service the full who/where context of the request.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { buildAuditContext } from '../utils';
import { RequestWithContext } from '../interfaces';

/**
 * Injects an `AuditContextData` object into a controller handler so it can be forwarded to
 * a service that makes explicit audit calls.
 *
 * WHY NOT JUST @CurrentUser()?
 *
 * @CurrentUser() gives you the actor, and that was the original approach here. But it leaves
 * an explicit audit record with `ip_address: null` and `request_id: null`, because a service
 * has no access to the request object. The consequence is subtle but real: that record cannot
 * be joined to the operational log lines for the same request, so you lose the ability to go
 * from "this value changed" to "here is the full execution path that changed it".
 *
 * This decorator bundles the actor AND the request context, and names its fields to match
 * AuditLogPayload — so a service just spreads it:
 *
 *   await this.auditLogService.record({ ...ctx, action, resource, before_state, after_state });
 *
 * @example
 * async update(@Param('id') id: string, @Body() dto: UpdateDto, @AuditContext() ctx: AuditContextData) {
 *   return this.service.update(id, dto, ctx);
 * }
 */
export const AuditContext = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithContext>();
  return buildAuditContext(request);
});
