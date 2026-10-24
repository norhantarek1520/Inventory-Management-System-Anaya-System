/**
 * @file main.ts
 * @description Application bootstrap. Installs the custom logger, validation, Swagger,
 *              and starts the HTTP server.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppLoggerService } from './commons/logger';

async function bootstrap() {
  //============================== Logger Installation (Approach A) ==========================================
  // `bufferLogs: true` holds back Nest's own startup logs until our logger is installed.
  // Without it, the framework's early boot lines are emitted by the DEFAULT logger — so in
  // production they come out as pretty-printed text while everything after them is JSON,
  // which breaks log ingestion on exactly the lines you need when a boot fails.
  // The <NestExpressApplication> generic is required for `app.set('trust proxy', ...)` below —
  // the plain INestApplication type does not expose Express-specific methods.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLoggerService('Bootstrap'),
    bufferLogs: true,
  });

  // Flush the buffer IMMEDIATELY, before anything that can block.
  //
  // This line is not optional, and the reason is a trap worth knowing: `bufferLogs` holds
  // logs until Nest decides to flush them, which normally happens once the app has
  // initialised. If initialisation HANGS — an unreachable database, a stuck connection retry —
  // you get a process that is alive and completely silent, with no clue what it is waiting on.
  // Flushing here gets the startup lines out first, so a hanging boot is diagnosable.
  app.flushLogs();

  // From here on, every `new Logger(SomeClass.name)` anywhere in the app — plus Nest's own
  // internal logs — routes through AppLoggerService and obeys its level + format policy.

  // A logger scoped to this function. Using Logger (not console.log) means these lines carry
  // a level, a timestamp and a context, and become JSON in production like everything else.
  const logger = new Logger('Bootstrap');

  //============================== Trust Proxy ==========================================
  // Behind Docker / nginx / a load balancer, `req.ip` is the proxy's address. Enabling this
  // makes Express read the real client IP from X-Forwarded-For — which is what both
  // HttpLoggerMiddleware and the audit trail record as `ip_address`. Without it, every audit
  // record would show the same internal Docker gateway IP and be useless for forensics.
  app.set('trust proxy', true);

  //============================== Global Validation Pipe ==========================================
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // ✅ Required to transform query string values into class instances/types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  //============================== Graceful Shutdown ==========================================
  // Lets Nest run onModuleDestroy hooks on SIGTERM/SIGINT so in-flight audit writes can
  // finish instead of being killed mid-flight when the container is recycled.
  app.enableShutdownHooks();

  // ============================== Swagger Configuration ==========================================
  const config = new DocumentBuilder()
    .setTitle('Inventory Management System - Anaya Market API')
    .setDescription('Product Management & System API documentation')
    .setVersion('1.0')
    .addBearerAuth() // Enables JWT token auth support in UI — needed to call the audit-log endpoints
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);

  //============================== Run the server ==========================================
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 Server is running on http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/doc`);
  logger.log(`🧾 Audit trail available at http://localhost:${port}/audit-log (requires audit:read)`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV ?? 'development'} | Log levels: ${process.env.LOG_LEVELS ?? 'env default'}`);
}

// A rejected bootstrap promise would otherwise produce an unhandled rejection with no context.
// Catching it here means a failed boot is logged at `fatal` with its stack, and the process
// exits non-zero so Docker / orchestrators actually notice the failure instead of restarting silently.
bootstrap().catch((error) => {
  new Logger('Bootstrap').fatal(`Application failed to start: ${error?.message}`, error?.stack);
  process.exit(1);
});
