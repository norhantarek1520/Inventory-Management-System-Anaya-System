import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { ROLES_KEY } from '../decorators';

/**
 * RolesGuard is a hard role gate for endpoints that must stay locked to specific
 * roles no matter what extra permissions a user has been granted (e.g. destructive,
 * hierarchy-sensitive operations). For everything else, prefer @Permissions() +
 * PermissionsGuard, which supports per-user permission overrides.
 *
 * super_admin always bypasses this check, since it has unlimited system override.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    return requiredRoles.includes(user.role);
  }
}
