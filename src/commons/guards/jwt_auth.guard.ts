import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
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
