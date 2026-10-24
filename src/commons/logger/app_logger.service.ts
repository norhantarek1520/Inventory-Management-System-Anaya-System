/**
 * @file app_logger.service.ts
 * @description APPROACH A — operational logging. A thin wrapper over NestJS's built-in
 *              ConsoleLogger that chooses log levels and output format based on NODE_ENV.
 */

import { ConsoleLogger, ConsoleLoggerOptions, Injectable, LogLevel, Scope } from '@nestjs/common';

/**
 * WHY A CUSTOM CLASS AT ALL, instead of just `new Logger()` everywhere?
 *
 * `new Logger(X.name)` inside a service is still the right way to EMIT a log — and we keep
 * doing exactly that. What you cannot do from inside a service is decide, globally and once,
 * *which levels get printed* and *in what format*. That is a bootstrap-level concern, and
 * this class is where it lives.
 *
 * Registering it in main.ts via `app.useLogger(...)` makes every `new Logger(...)` call in
 * the entire application — plus Nest's own internal framework logs — route through here.
 * So the whole app's log policy is configured in one file, with zero `if (isDev)` checks
 * scattered through business code.
 *
 * Two things change per environment:
 *
 *  1. LEVELS. Development prints everything down to `verbose` because you are hunting bugs
 *     and want the noise. Production prints only log/warn/error/fatal — `debug` output in
 *     production costs real money on hosted log platforms and, worse, buries the entries
 *     that actually matter.
 *
 *  2. FORMAT. Development gets colorized, human-aligned text, because the reader is your
 *     eyes in a terminal. Production gets one JSON object per line, because the reader is a
 *     machine (Datadog / Loki / CloudWatch) that must be able to run queries like
 *     `level:error AND context:CategoryService`. You cannot query pretty-printed text.
 *     See docs/tasks/04-logging-and-audit-trail.md §1.5.
 */
@Injectable({ scope: Scope.TRANSIENT }) // TRANSIENT so each injecting class gets its own context
export class AppLoggerService extends ConsoleLogger {
  constructor(context?: string) {
    super(context ?? 'App', AppLoggerService.buildOptions());
  }

  // ========================================== 1. Overrides ==========================================

  /**
   * NestJS's default timestamp is a locale-formatted string plus a "+Nms since last log" delta.
   * That delta is handy locally but useless in aggregated logs. We emit a sortable ISO-8601
   * UTC timestamp instead — always store UTC, render local only at display time, so that
   * logs from servers in different timezones can still be ordered against each other.
   */
  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  // ========================================== 2. Private Helpers & Utilities ==========================================

  /**
   * Builds the ConsoleLogger options for the current environment.
   * Static because it runs in the constructor, before `this` exists.
   */
  private static buildOptions(): ConsoleLoggerOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      logLevels: AppLoggerService.resolveLogLevels(),
      json: isProduction, // structured in prod, pretty in dev
      colors: !isProduction, // ANSI colors would corrupt a JSON log pipeline
      timestamp: true,
    };
  }

  /**
   * Resolves which levels are enabled.
   *
   * Priority:
   *   1. An explicit LOG_LEVELS env var ("error,warn,log") — lets ops turn `debug` on in
   *      production temporarily to chase an incident, without a redeploy. This escape hatch
   *      is the single most useful logging feature you can give your future self.
   *   2. Otherwise, a sensible default per NODE_ENV.
   */
  private static resolveLogLevels(): LogLevel[] {
    const configured = process.env.LOG_LEVELS?.trim();

    // Step 1: honour an explicit override if one was provided.
    if (configured) {
      const allowed: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];
      const parsed = configured
        .split(',')
        .map((level) => level.trim().toLowerCase())
        .filter((level): level is LogLevel => (allowed as string[]).includes(level));

      if (parsed.length > 0) {
        return parsed;
      }
    }

    // Step 2: fall back to environment defaults.
    switch (process.env.NODE_ENV) {
      case 'production':
        // No `debug`/`verbose`: too expensive and too noisy to be useful at scale.
        return ['fatal', 'error', 'warn', 'log'];
      case 'test':
        // Keep the test runner output readable — failures only.
        return ['fatal', 'error'];
      default:
        // Development / staging: show everything.
        return ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];
    }
  }
}