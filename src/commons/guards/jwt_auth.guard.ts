import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';

/**
 * Registered globally (see AppModule) so every route requires a valid JWT by default.
 * Routes that shouldn't require auth (login, register, refresh-token, ...) must be
 * explicitly opted out with @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (info) {
      // `warn`, not `error`: an expired or malformed token is the CALLER's problem, not a
      // server fault. Logging it as an error would fill the error channel with normal traffic
      // until nobody trusts it (see AllExceptionsFilter for the same reasoning).
      //
      // Only `info.message` is logged - never `info` wholesale and never the raw token, which
      // is a live credential (docs section 1.6).
      this.logger.warn(`JWT rejected: ${info.message ?? 'invalid token'}`);
    }
    if (err || !user) {
      throw err || new UnauthorizedException('Access denied. Valid JWT token required.');
    }
    return user;
  }
}
