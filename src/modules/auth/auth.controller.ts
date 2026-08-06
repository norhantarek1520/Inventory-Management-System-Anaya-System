import { Controller, Get, Post, Body, Param, Patch, Delete, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from 'src/commons';
import { RegisterDto, ResetPasswordDto, LoginDto } from 'src/commons/dtos/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ========================================== 1. User Register & Onboarding Flow ==========================================

  @Post('register')
  public async registerUser(@Body() registerDto: RegisterDto) {
    console.log('✨ Starting user registration process...');
    return this.authService.registerUser(registerDto);
  }

  //=============================================================================================

  @Post('first-time-password-reset')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  public async setup2FA(@Req() req: any) {
    console.log('✨ Starting setup 2FA process...');

    // POST /auth/2fa/setup
  }
  //=============================================================================================

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  public async verify2FASetup(@Req() req: any, @Body() dto: any) {
    console.log('✨ Starting verify 2FA setup process...');

    // POST /auth/2fa/verify
  }

  // ========================================== 2. Core Authentication & Session Management ==========================================

  @Post('login')
  public async login(@Body() loginDto: LoginDto) {
    console.log('✨ Starting user login process...');
    return this.authService.login(loginDto);
  }
  //=============================================================================================

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  public async refreshTokens(@Req() req: any) {
    console.log('✨ Starting user refresh token process...');

    // POST /auth/refresh
  }
  //=============================================================================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  public async logout(@Req() req: any) {
    console.log('✨ Starting user logout process...');

    // POST /auth/logout
  }

  // ========================================== 3. Password Recovery Lifecycle ==========================================

  @Post('forgot-password')
  public async forgotPassword(@Body() dto: any) {
    console.log('✨ Starting user forget password process...');

    // POST /auth/forgot-password
  }
  //=============================================================================================

  @Post('reset-password')
  public async resetPassword(@Body() dto: any) {
    console.log('✨ Starting user reset password process...');

    // POST /auth/reset-password
  }
  //=============================================================================================
}
