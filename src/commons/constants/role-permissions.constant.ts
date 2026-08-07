import { Permission } from '../enums/permission.enum';
import { Role } from '../enums/role.enum';

/**
 * Default permission set granted to each role.
 * This is the single source of truth for "what a role can do out of the box".
 *
 * super_admin is not enumerated with real values on purpose — it always bypasses
 * permission checks entirely (see PermissionsGuard). Object.values(Permission) is kept
 * here only so `ROLE_PERMISSIONS[Role.SUPER_ADMIN]` is never undefined if referenced directly.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.ADMIN]: [
    Permission.USERS_CREATE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_DELETE,
    Permission.TASKS_REVIEW,
    Permission.REPORTS_READ,
  ],

  [Role.PROCUREMENT_MANAGER]: [
    Permission.PRODUCTS_CREATE,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_UPDATE,
    Permission.PRODUCTS_DELETE,
    Permission.ORDERS_CREATE,
    Permission.ORDERS_READ,
    Permission.ORDERS_UPDATE,
    Permission.ORDERS_APPROVE,
    Permission.STOCK_READ,
  ],

  [Role.INVENTORY_STAFF]: [Permission.PRODUCTS_READ, Permission.STOCK_READ, Permission.STOCK_ADJUST, Permission.STOCK_COUNT],

  // Machine-to-machine account for POS / E-COM integrations — intentionally minimal.
  [Role.SYSTEM_SERVICE]: [Permission.STOCK_READ, Permission.STOCK_DEDUCT],
};

/**
 * Computes the effective permission set for a user:
 * role's default permissions ∪ any extra permissions granted individually on that user.
 * This is what lets an admin give a specific user more access than their role normally allows.
 */
export function getEffectivePermissions(role: Role, extraPermissions: string[] = []): string[] {
  const basePermissions: string[] = ROLE_PERMISSIONS[role] ?? [];
  return Array.from(new Set([...basePermissions, ...extraPermissions]));
}
