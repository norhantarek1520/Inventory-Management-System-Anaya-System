import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares which permission(s) are required to call this endpoint.
 * A user passes if their EFFECTIVE permission set (their role's defaults ∪ any
 * extra permissions granted to them individually) contains ALL listed permissions.
 * super_admin always bypasses this check — see PermissionsGuard.
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
