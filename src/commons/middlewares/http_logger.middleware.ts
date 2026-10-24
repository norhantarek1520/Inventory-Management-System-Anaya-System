/**
 * @file http_logger.middleware.ts
 * @description APPROACH A — the access log. One operational log line per HTTP request,
 *              emitted after the response is sent.
 */

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { RequestWithContext } from '../interfaces';
import { resolveClientIp } from '../utils';

/**
 * WHY A MIDDLEWARE AND NOT AN INTERCEPTOR?
 *
 * Interceptors only wrap requests that actually reached a controller handler. Middleware runs
 * earlier and lower, so it also sees requests that a guard rejected with 401/403 and requests
 * that 404'd because no route matched. Those are precisely the ones you want in an access log —
 * a flood of 404s or 401s is how you notice someone scanning your API.
 *
 * WHY `res.on('finish')` INSTEAD OF LOGGING IMMEDIATELY?
 *
 * Because at the top of the middleware the interesting facts don't exist yet: there is no
 * status code and no duration. `finish` fires once the response has been handed to the OS,
 * so by then everything is known. This also means exactly one line per request, logged after
 * the fact — the standard web-server access-log shape (nginx, Apache) rather than a noisy
 * "incoming… outgoing…" pair.
 *
 * This log is DISPOSABLE (docs §1.2). It goes to stdout and is rotated away. The permanent
 * who/when/what record is the audit trail, written separately by AuditInterceptor.
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  // One logger per class, named after it, so the `[HTTP]` context column stays meaningful.
  private readonly logger = new Logger('HTTP');

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') ?? 'unknown';
    // Shared with the audit interceptor so a log line and its audit record can never
    // disagree about where a request came from.
    const ip = resolveClientIp(req);

    // Step 1: Defer the actual logging until the response is complete.
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') ?? '0';

      // Step 2: Compute duration from the timestamp set by CorrelationIdMiddleware.
      const duration = req.startTime ? Date.now() - req.startTime : 0;

      // Step 3: Identify the actor if a guard authenticated one. Note we log the EMAIL, never
      // the token — a log line must never contain a credential (docs §1.6).
      const actor = req.user?.email ?? 'anonymous';

      const message =
        `${method} ${originalUrl} ${statusCode} ${contentLength}b - ${duration}ms ` +
        `[req:${req.requestId ?? 'n/a'}] [user:${actor}] [ip:${ip}] [ua:${userAgent}]`;

      // Step 4: Pick the level from the status code — this is what makes the log greppable.
      // Searching `level:error` must surface real server faults only, so:
      //   5xx → error (our bug), 4xx → warn (caller's mistake, but worth watching), else log.
      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}