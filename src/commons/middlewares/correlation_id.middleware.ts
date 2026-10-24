/**
 * @file correlation_id.middleware.ts
 * @description APPROACH A — assigns every incoming HTTP request a unique id so that all
 *              log lines produced while handling it can be stitched back together.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestWithContext } from '../interfaces';

/**
 * THE PROBLEM THIS SOLVES — and it is the one beginners most often skip.
 *
 * Your server handles many requests at once. All their log lines land in the same stream,
 * interleaved:
 *
 *   [CategoryService] Step 1: creating category
 *   [ProductService]  Step 1: validating parent category
 *   [CategoryService] Step 2: duplicate check passed
 *   [ProductService]  Mongo write failed
 *
 * Which "Step 1" belongs to the request that failed? With this middleware, impossible to
 * confuse — every line carries the same short id for the lifetime of one request:
 *
 *   [req:a1f39c2e] [CategoryService] Step 1: creating category
 *   [req:7b40e1d5] [ProductService]  Step 1: validating parent category
 *
 * The same id is written onto the audit record (`request_id`) and returned to the client in
 * the `X-Request-Id` response header. That last part matters operationally: a user can report
 * "I got an error, request id a1f39c2e" and you can retrieve their exact execution path —
 * both the throwaway console lines and the permanent audit row.
 *
 * Registration order is important: this runs BEFORE HttpLoggerMiddleware (see app.module.ts),
 * because the access logger needs the id to already exist.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    // Step 1: Reuse an upstream id if one was forwarded.
    // In a multi-service setup (API gateway, POS integration) the caller may already have
    // started a trace. Respecting their id keeps one logical operation traceable across
    // service boundaries instead of restarting the trail at every hop.
    const incomingId = req.headers['x-request-id'];
    const resolvedId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : randomUUID();

    // Step 2: Attach to the request so guards / interceptors / services can read it.
    req.requestId = resolvedId;

    // Step 3: Stamp the request start time — the single source of truth for duration.
    // Taken here, at the very first middleware, so the measured duration covers guards and
    // pipes too, not just the controller body.
    req.startTime = Date.now();

    // Step 4: Echo it back so the client can quote it in a bug report.
    res.setHeader('X-Request-Id', resolvedId);

    next();
  }
}