/**
 * @file audit_log.module.ts
 * @description Wires the audit trail: registers the Mongoose model, the service and the
 *              read-only controller.
 */

import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from 'src/commons/schema';
import { AuditLogService } from './audit_log.service';
import { AuditLogController } from './audit_log.controller';

/**
 * WHY @Global()?
 *
 * Normally a module must be imported wherever its providers are needed. AuditLogService is
 * different: it is a genuinely cross-cutting concern that nearly every feature module will
 * eventually want to call for an explicit, detailed audit entry.
 *
 * Without @Global(), we would have to add `imports: [AuditLogModule]` to CategoryModule,
 * ProductModule, UserModule, and every module written from now on — and the day someone
 * forgets, their audit calls fail to resolve at boot. Making it global removes that whole
 * class of mistake.
 *
 * @Global() is overused in NestJS codebases and usually a smell, so the justification matters:
 * it is appropriate here precisely because this is infrastructure (like logging or config)
 * rather than a domain feature. It is also required by the global AuditInterceptor registered
 * in AppModule, which needs AuditLogService resolvable from the root injector.
 */
@Global()
@Module({
  imports: [
    // Registers the `audit_logs` collection and makes AuditLogModel injectable.
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  // Exported so AuditInterceptor (and any feature service making explicit calls) can inject it.
  exports: [AuditLogService],
})
export class AuditLogModule {}