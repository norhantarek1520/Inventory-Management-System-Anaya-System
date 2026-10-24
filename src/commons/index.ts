export * from './enums';
export * from './dtos';
export * from './decorators';
export * from './schema';
export * from './guards';
export * from './strategies';
export * from './constants';
export * from './interfaces';
export * from './utils';
export * from './logger';
export * from './middlewares';

// NOTE: './interceptors' and './filters' are deliberately NOT re-exported here.
//
// Both AuditInterceptor and AllExceptionsFilter depend on AuditLogService (in src/modules),
// and AuditLogService imports from this barrel. Re-exporting them would close that loop into
// a circular import, which under CommonJS resolves to `undefined` at decorator-evaluation
// time and fails at boot with a confusing "Nest can't resolve dependencies" error. (That is
// exactly the failure mode that once crashed this app via commons/schema/user.schema.ts —
// see the note in that file.)
//
// Import them by direct path instead:
//   import { AuditInterceptor } from 'src/commons/interceptors/audit.interceptor';
//   import { AllExceptionsFilter } from 'src/commons/filters/all_exceptions.filter';
