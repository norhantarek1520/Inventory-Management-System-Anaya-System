import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication at all.
 * Needed once JwtAuthGuard is registered globally (e.g. login, register, refresh-token).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
