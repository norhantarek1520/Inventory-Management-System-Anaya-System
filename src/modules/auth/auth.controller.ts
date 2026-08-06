import { Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, Public } from 'src/commons';
import { RegisterDto, ResetPasswordDto, LoginDto, RefreshTokenDto } from 'src/commons/dtos/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========================================== 1. User Register & Onboarding Flow ==========================================

  @Post('register')
  @Public()
  public async registerUser(@Body() registerDto: RegisterDto) {
    console.log('✨ Starting user registration process...');
    return this.authService.registerUser(registerDto);
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
  public async forcePasswordReset(@CurrentUser('userId') userId: string, @Body() dto: ResetPasswordDto) {
    console.log('✨ Starting force password reset process...');
    // todo: extract actual userId from JWT payload via request context / decorator
    return this.authService.forcePasswordReset(userId, dto);
  }
  //=============================================================================================

  @Post('2fa/setup')
  public async setup2FA(@Req() req: any) {
    console.log('✨ Starting setup 2FA process...');

    // POST /auth/2fa/setup
  }
  //=============================================================================================

  @Post('2fa/verify')
  public async verify2FASetup(@Req() req: any, @Body() dto: any) {
    console.log('✨ Starting verify 2FA setup process...');

    // POST /auth/2fa/verify
  }

  // ========================================== 2. Core Authentication & Session Management ==========================================

  @Post('login')
  @Public()
  public async login(@Body() loginDto: LoginDto) {
    console.log('✨ Starting user login process...');
    return this.authService.login(loginDto);
  }
  //=============================================================================================

  @Post('refresh-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  public async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }
  //=============================================================================================

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  public async logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  // ========================================== 3. Password Recovery Lifecycle ==========================================

  @Post('forgot-password')
  @Public()
  public async forgotPassword(@Body() dto: any) {
    console.log('✨ Starting user forget password process...');

    // POST /auth/forgot-password
  }
  //=============================================================================================

  @Post('reset-password')
  @Public()
  public async resetPassword(@Body() dto: any) {
    console.log('✨ Starting user reset password process...');

    // POST /auth/reset-password
  }
  //=============================================================================================
}
