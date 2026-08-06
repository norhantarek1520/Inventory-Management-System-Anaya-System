import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { Permission } from '../enums/permission.enum';
import { PERMISSIONS_KEY } from '../decorators';

/**
 * PermissionsGuard checks the JWT-embedded `permissions` claim against whatever
 * @Permissions(...) the target route declares.
 *
 * The token's `permissions` claim is the user's EFFECTIVE permission set, computed at
 * login time as: role's default permissions ∪ that user's individually granted extra
 * permissions (see getEffectivePermissions / ROLE_PERMISSIONS). That's what lets an
 * admin give someone more access than their role would normally allow — the grant is
 * just added to that user's `permissions` array, and it flows into their next token.
 *
 * super_admin always bypasses this check (SuperAdminBypass).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }
}
