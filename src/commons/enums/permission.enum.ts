// Canonical list of granular permission strings usable in User.permissions[]
// Format: "<module>:<action>" — matches examples referenced in the auth spec
// (docs/tasks/02-Authentication & Authorization Module Specification.md)
export enum Permission {
  // --- Users ---
  USERS_CREATE = 'users:create',
  USERS_READ = 'users:read',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',

  // --- Products / Catalog ---
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_READ = 'products:read',
  PRODUCTS_UPDATE = 'products:update',
  PRODUCTS_DELETE = 'products:delete',

  // --- Stock / Inventory ---
  STOCK_READ = 'stock:read',
  STOCK_ADJUST = 'stock:adjust',
  STOCK_DEDUCT = 'stock:deduct',
  STOCK_COUNT = 'stock:count',

  // --- Purchase Orders / Procurement ---
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_APPROVE = 'orders:approve',

  // --- Task & Audit Review ---
  TASKS_REVIEW = 'tasks:review',

  // --- Reports ---
  REPORTS_READ = 'reports:read',

  // --- System Settings ---
  SYSTEM_SETTINGS_MANAGE = 'system:settings:manage',
}
