import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      // 1. Extract Bearer token from 'Authorization' HTTP header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 2. Secret used to verify the token signature
      secretOrKey: configService.get<string>('JWT_SECRET') || 'superSecretKey',
    });
  }
  //   // 3. Called automatically after the token signature and expiration are verified
  //   async validate(payload: any) {
  //     const user = await this.userService.getUserById(payload.sub);

  //     if (!user) {
  //       throw new UnauthorizedException('Token user no longer exists');
  //     }
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role, permissions: payload.permissions || [] };
  }
}
