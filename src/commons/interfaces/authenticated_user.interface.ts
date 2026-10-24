/**
 * @file authenticated_user.interface.ts
 * @description Shape of `request.user` after JwtAuthGuard runs.
 */

import { Role } from '../enums';

/**
 * This mirrors exactly what JwtStrategy.validate() returns (see commons/strategies/jwt.strategy.ts).
 * Typing it here means the audit interceptor and @CurrentUser consumers stop using `any`
 * and get a compile error if the token payload shape ever changes.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  permissions: string[];
}