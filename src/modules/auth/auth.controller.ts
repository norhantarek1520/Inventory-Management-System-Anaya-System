/**
 * @file auth.controller.ts
 * @description Authentication endpoints. Every route is labelled with @Audit() because
 *              authentication events are the highest-value entries in an audit trail.
 */

import { Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus, Req, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, Public, Audit, AuditAction, AuditResource } from 'src/commons';
import { RegisterDto, LoginDto, RefreshTokenDto, ForgetPasswordDto, ResetPasswordDto, ForceResetPasswordDto } from 'src/commons/dtos/auth';

@Controller('auth')
export class AuthController {
  /**
   * Replaces the console.log calls that used to be in this file.
   *
   * console.log has no level (so it cannot be filtered out in production), no context label
   * (so you cannot tell which class spoke), no timestamp, and it ignores the JSON formatting
   * the rest of the app switches to in production - meaning those lines would be the ones
   * that break log ingestion. See docs/tasks/04-logging-and-audit-trail.md sections 1.3-1.5.
   */
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * WHY EVERY ROUTE HERE IS DECORATED, unlike the catalog controllers.
   *
   * Without @Audit(), AuditInterceptor infers the action from the HTTP verb - so a login came
   * out as `action: CREATE, resource: AUTH`, which is both wrong and unqueryable. You could
   * not ask "show me failed logins" because no record said LOGIN.
   *
   * Failed logins need no special handling: the interceptor records the exception path
   * automatically as `action: LOGIN, status: FAILURE`. To hunt brute-force attempts:
   *     GET /audit-log?action=LOGIN&status=FAILURE
   *
   * The password fields in these request bodies are scrubbed to '[REDACTED]' by the
   * interceptor before anything is persisted (docs section 1.6) - a credential must never
   * reach a collection that managers and auditors can read.
   */

  // ========================================== 1. User Register & Onboarding Flow ==========================================

  @Post('register')
  @Public()
  @Audit({ action: AuditAction.CREATE, resource: AuditResource.USER, description: 'Registered a new user account' })
  public async registerUser(@Body() dto: RegisterDto) {
    // Logs the identifier, never the password.
    this.logger.log(`Registration attempt for username="${dto.username}" email="${dto.email}"`);
    return this.authService.registerUser(dto);
  }

  //=============================================================================================

  @Post('first-time-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force password reset',
    description: 'Resets the user password on first login and updates system flags.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed or passwords do not match.' })
  @Audit({ action: AuditAction.PASSWORD_RESET, resource: AuditResource.AUTH, description: 'Completed forced first-time password reset' })
  public async forcePasswordReset(@CurrentUser('userId') userId: string, @Body() dto: ForceResetPasswordDto) {
    this.logger.log(`Forced first-time password reset for userId=${userId}`);
    return this.authService.forcePasswordReset(userId, dto);
  }
  //=============================================================================================

  @Post('2fa/setup')
  @Audit({ action: AuditAction.TWO_FACTOR_SETUP, resource: AuditResource.AUTH, description: 'Initiated two-factor authentication setup' })
  public async setup2FA(@Req() req: any) {
    this.logger.log('Two-factor setup initiated');

    // POST /auth/2fa/setup
  }
  //=============================================================================================

  @Post('2fa/verify')
  @Audit({ action: AuditAction.TWO_FACTOR_SETUP, resource: AuditResource.AUTH, description: 'Verified two-factor authentication setup code' })
  public async verify2FASetup(@Req() req: any, @Body() dto: any) {
    this.logger.log('Two-factor setup verification attempted');

    // POST /auth/2fa/verify
  }

  // ========================================== 2. Core Authentication & Session Management ==========================================

  @Post('login')
  @Public()
  // A failed attempt is recorded automatically as LOGIN + status FAILURE by the interceptor.
  @Audit({ action: AuditAction.LOGIN, resource: AuditResource.AUTH, description: 'User login attempt' })
  public async login(@Body() dto: LoginDto) {
    this.logger.log(`Login attempt for loginKey="${dto.loginKey}"`);
    return this.authService.login(dto);
  }
  //=============================================================================================

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  // captureBody: false - the body is nothing but a refresh token. Even though the redaction
  // list would scrub it, the safest handling of a credential-only payload is to not store the
  // body at all. The record still captures who, when, from where, and the outcome.
  @Audit({ action: AuditAction.TOKEN_REFRESH, resource: AuditResource.AUTH, description: 'Refreshed access token', captureBody: false })
  public async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }
  //=============================================================================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @Audit({ action: AuditAction.LOGOUT, resource: AuditResource.AUTH, description: 'User logged out and refresh token invalidated' })
  public async logout(@CurrentUser('userId') userId: string) {
    this.logger.log(`Logout for userId=${userId}`);
    return this.authService.logout(userId);
  }

  // ========================================== 3. Password Recovery Lifecycle ==========================================

  @Post('forgot-password')
  @Public()
  @Audit({ action: AuditAction.PASSWORD_RESET_REQUEST, resource: AuditResource.AUTH, description: 'Requested a password reset code' })
  public async forgotPassword(@Body() dto: ForgetPasswordDto) {
    this.logger.log('Password reset requested');
    return this.authService.forgotPassword(dto);
  }
  //=============================================================================================

  @Post('reset-password')
  @Public()
  @Audit({ action: AuditAction.PASSWORD_RESET, resource: AuditResource.AUTH, description: 'Completed a password reset' })
  public async resetPassword(@Body() dto: ResetPasswordDto) {
    this.logger.log('Password reset submitted');
    return this.authService.resetPassword(dto);
  }
  //=============================================================================================
}
