/**
 * @file all_exceptions.filter.ts
 * @description APPROACH A — global catch-all exception filter. Guarantees every thrown
 *              error is logged (with a stack trace for real faults) and that clients
 *              receive a consistent error body.
 */

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AuditLogService } from 'src/modules/audit_log/audit_log.service';
import { AuditAction, AuditResource, AuditStatus } from '../enums';
import { RequestWithContext } from '../interfaces';
import { buildAuditContext } from '../utils';

/**
 * WHY THIS FILE EXISTS.
 *
 * Without a global filter, Nest still returns a 500 for an unhandled error — but what gets
 * logged is up to the framework, and anything thrown outside a controller can slip past with
 * no stack trace at all. "Log everything" has to include the failures, and failures are the
 * entries you will actually spend your nights reading.
 *
 * `@Catch()` with NO argument means "catch absolutely everything" — HttpExceptions, Mongoose
 * errors, TypeErrors, and even non-Error values like a thrown string.
 *
 * It does two jobs:
 *   1. Logs the error at the correct level, with the correlation id so it joins up with the
 *      access log and the audit record for the same request.
 *   2. Normalises the response body, so clients never see a raw stack trace. Leaking stack
 *      traces to clients is an information-disclosure vulnerability: they reveal file paths,
 *      library versions and internal structure (docs §1.6).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    // The adapter host is injected so this filter works regardless of the underlying HTTP
    // platform (Express here, but Fastify would need no change).
    private readonly httpAdapterHost: HttpAdapterHost,
    // Injected to close a real gap in the audit trail — see auditAccessDenial() below.
    private readonly auditLogService: AuditLogService,
  ) {}

  // ========================================== 1. Entry Point ==========================================

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithContext>();
    const response = ctx.getResponse();

    // Step 1: Work out the HTTP status. A deliberate HttpException (NotFoundException,
    // ConflictException, ...) carries its own; anything else is an unplanned 500.
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Step 2: Extract a message to return. For HttpExceptions this preserves class-validator's
    // field-level messages array; otherwise we return a deliberately vague string.
    const responseBody = this.buildResponseBody(exception, status, request, isHttpException);

    // Step 3: Log at the right level, with the right amount of detail.
    //
    // The distinction matters: a 404 is NORMAL traffic. If you log 404s as errors with full
    // stack traces, your error log fills with non-problems and you stop reading it — which is
    // how real incidents get missed. So:
    //   - 5xx  → error + full stack. This is our bug; we need the trace.
    //   - 4xx  → warn, message only. The caller made a mistake; no trace needed.
    const context = `${request?.method ?? '-'} ${request?.originalUrl ?? '-'} [req:${request?.requestId ?? 'n/a'}] [user:${request?.user?.email ?? 'anonymous'}]`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled exception on ${context}: ${this.extractMessage(exception)}`, this.extractStack(exception));
    } else {
      this.logger.warn(`Request rejected (${status}) on ${context}: ${this.extractMessage(exception)}`);
    }

    // Step 4: Record authentication/authorisation denials in the AUDIT trail.
    this.auditAccessDenial(request, status, exception);

    // Step 5: Send the normalised body.
    httpAdapter.reply(response, responseBody, status);
  }

  // ========================================== 2. Private Helpers & Utilities ==========================================

  /**
   * Writes an ACCESS_DENIED audit record for 401 and 403 responses.
   *
   * THIS CLOSES A GAP THAT IS EASY TO MISS. NestJS runs guards BEFORE interceptors. So when
   * JwtAuthGuard or PermissionsGuard rejects a request, AuditInterceptor never executes and
   * the attempt never reaches the audit trail — even though "someone tried to call an endpoint
   * they are not allowed to call" is one of the most security-relevant events in the system.
   * The exception filter is the first place in the pipeline that sees these, so it is where
   * they have to be recorded.
   *
   * The `auditHandled` check prevents double-recording: if AuditInterceptor already ran (i.e.
   * the request got past the guards and the 403 was thrown by business logic instead), it has
   * already written a FAILURE record and we must not add a second one.
   */
  private auditAccessDenial(request: RequestWithContext, status: number, exception: unknown): void {
    // Step 1: Only denials are of interest here. Every other failure either was recorded by
    // AuditInterceptor or is a plain operational error with no audit significance.
    const isDenial = status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN;
    if (!isDenial) {
      return;
    }

    // Step 2: Skip if the interceptor already owns this request.
    if (request?.auditHandled) {
      return;
    }

    // Step 3: Record. Not awaited, and `record()` never throws — a failing audit write must
    // never prevent the client from receiving its 401/403.
    void this.auditLogService.record({
      ...buildAuditContext(request),
      action: AuditAction.ACCESS_DENIED,
      // UNKNOWN rather than a guess: the filter has no route metadata to infer from, and a
      // wrong resource label is worse than an honest "unclassified" — `endpoint` on the
      // record still says exactly what was being accessed.
      resource: AuditResource.UNKNOWN,
      status: AuditStatus.FAILURE,
      description: `Access denied (${status}) to ${request?.method ?? '-'} ${request?.originalUrl ?? '-'}`,
      error_message: this.extractMessage(exception),
    });
  }

  //==============================================================================================

  /**
   * Builds the client-facing error payload.
   * Every error response in the API has this same shape, which makes the frontend's
   * error handling trivial — and includes `requestId` so a user can quote it to support.
   */
  private buildResponseBody(exception: unknown, status: number, request: RequestWithContext, isHttpException: boolean) {
    // For an HttpException, `getResponse()` is either a string or Nest's
    // { statusCode, message, error } object — we forward its `message` as-is so
    // class-validator's array of field errors survives intact.
    let message: string | string[] = 'Internal server error';

    if (isHttpException) {
      const exceptionResponse = (exception as HttpException).getResponse();
      message = typeof exceptionResponse === 'string' ? exceptionResponse : ((exceptionResponse as any).message ?? (exception as HttpException).message);
    }

    return {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.originalUrl ?? null,
      method: request?.method ?? null,
      // Returned deliberately: it is the key the user gives support to find their exact request.
      requestId: request?.requestId ?? null,
      message,
    };
  }

  /** Safely pulls a message out of anything that was thrown — including non-Error values. */
  private extractMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    // Someone threw a string, number, or plain object. `String()` never itself throws.
    return typeof exception === 'object' ? JSON.stringify(exception) : String(exception);
  }

  /** Returns the stack trace if there is one. Non-Error throws simply have none. */
  private extractStack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}