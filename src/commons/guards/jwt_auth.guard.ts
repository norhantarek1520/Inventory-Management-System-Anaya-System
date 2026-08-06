import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
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
      console.log('🔴 JWT Guard Error Info:', info.message || info);
    }
    if (err || !user) {
      throw err || new UnauthorizedException('Access denied. Valid JWT token required.');
    }
    return user;
  }
}
