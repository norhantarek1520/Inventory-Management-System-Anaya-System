import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========================================== 1. User Creation & Onboarding Flow ==========================================

  @Post('users')
  public async createUser(@Body() dto: any) {
    // POST /auth/users — Restrict to super_admin & admin via RolesGuard
  }

  @Post('first-time-password-reset')
  public async forcePasswordReset(@Body() dto: any) {
    // POST /auth/first-time-password-reset
  }

  @Post('2fa/setup')
  public async setup2FA(@Req() req: any) {
    // POST /auth/2fa/setup
  }

  @Post('2fa/verify')
  public async verify2FASetup(@Req() req: any, @Body() dto: any) {
    // POST /auth/2fa/verify
  }

  // ========================================== 2. Core Authentication & Session Management ==========================================

  @Post('login')
  public async login(@Body() dto: any) {
    // POST /auth/login
  }

  @Post('refresh')
  public async refreshTokens(@Req() req: any) {
    // POST /auth/refresh
  }

  @Post('logout')
  public async logout(@Req() req: any) {
    // POST /auth/logout
  }

  // ========================================== 3. Password Recovery Lifecycle ==========================================

  @Post('forgot-password')
  public async forgotPassword(@Body() dto: any) {
    // POST /auth/forgot-password
  }

  @Post('reset-password')
  public async resetPassword(@Body() dto: any) {
    // POST /auth/reset-password
  }
}
