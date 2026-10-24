import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard, JwtAuthGuard, PermissionsGuard, CorrelationIdMiddleware, HttpLoggerMiddleware } from 'src/commons';
// These two are imported by direct path, not via the 'src/commons' barrel — see the note in
// commons/index.ts about the circular import that avoids.
import { AuditInterceptor } from 'src/commons/interceptors/audit.interceptor';
import { AllExceptionsFilter } from 'src/commons/filters/all_exceptions.filter';
import { AuthModule } from '../auth/auth.module';
import { SeedersModule } from '../../database/seeders/seeders.module';
import { CategoryModule } from '../category/category.module';
import { SubCategoryModule } from '../sub_category/sub_category.module';
import { ProductModule } from '../product/product.module';
import { ProductItemModule } from '../product_item/product_item.module';
import { AuditLogModule } from '../audit_log/audit_log.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    // @Global() module — provides AuditLogService to every other module without them
    // having to import it. Must be registered here for the global AuditInterceptor below
    // to be resolvable from the root injector.
    AuditLogModule,
    UserModule,
    AuthModule,
    SeedersModule, //it initializes on every boot.
    CategoryModule,
    SubCategoryModule,
    ProductModule,
    ProductItemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard chain — runs in this order for every route, all must pass:
    // 1. JwtAuthGuard: verifies the token, populates `request.user` (skipped by @Public()).
    // 2. RolesGuard: hard role gate for endpoints locked with @Roles() (super_admin bypasses).
    // 3. PermissionsGuard: fine-grained check against @Permissions() (super_admin bypasses).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },

    // ========================================== Audit Trail (Approach B) ==========================================
    // Registering the interceptor here, rather than per-controller, is what makes auditing
    // DEFAULT-ON for the entire application. Every POST/PATCH/PUT/DELETE gets a permanent
    // record with no per-module code, so a module added next year is audited automatically.
    // A route opts out only by declaring @NoAudit().
    //
    // EXECUTION ORDER MATTERS: Nest runs guards BEFORE interceptors. That ordering is what
    // lets AuditInterceptor read `request.user` — by the time it runs, JwtAuthGuard has
    // already attached the authenticated identity. Reverse the order and every audit record
    // would say ANONYMOUS.
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },

    // ========================================== Error Logging (Approach A) ==========================================
    // Catch-all filter: guarantees every thrown exception is logged with a stack trace and
    // that clients get a consistent error body (never a leaked stack).
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Registers the operational-logging middlewares (Approach A).
   *
   * ORDER IS SIGNIFICANT and this is the easiest thing to get wrong:
   *   1. CorrelationIdMiddleware — mints `req.requestId` and stamps `req.startTime`.
   *   2. HttpLoggerMiddleware    — reads both of them to build its access-log line.
   *
   * Swap them and the access log prints `[req:n/a]` with a duration of 0ms, silently. Nest
   * applies middleware in the order passed to `.apply()`, so the sequence below is the fix.
   *
   * Why middleware rather than another interceptor? Middleware runs earlier in the stack, so
   * it also observes requests that never reach a controller — 404s on unmatched routes and
   * 401/403s rejected by a guard. Those are exactly the requests an access log needs to show,
   * because a burst of them is how you spot someone scanning your API.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, HttpLoggerMiddleware)
      // '*' would also work; this explicit form documents that we log every verb on every path.
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
