import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto, ResetPasswordDto, LoginDto, RefreshTokenDto } from 'src/commons/dtos/auth';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/commons/schema/user.schema';
import { JwtService } from '@nestjs/jwt';
import { getEffectivePermissions } from 'src/commons/constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  //==================  User Register & Onboarding Flow ==========================================

  public async registerUser(registerDto: RegisterDto) {
    try {
      // 1. Find user by email and username
      const user = await this.userModel
        .findOne({
          $or: [{ email: registerDto.email }, { username: registerDto.username }],
        })
        .exec();

      if (!user) {
        throw new Error('User with this email is not exists ');
      }

      // 2. Compare incoming plain-text password with stored hash
      const isPasswordValid = await this.comparePassword(registerDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password credentials');
      }
      //todo: Genrate jwt
      //3. Genrate genrate jwt token , and tell him that the next step is to reset the password then setup 2fa with this token if he want this
      const accessToken = await this.generateAccessToken(user);
      return {
        message: 'Authentication successful. Please proceed to reset your password or configure 2FA.',
        accessToken,
        isMustResetPassword: user.isMustResetPassword,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        nextSteps: user.isMustResetPassword ? 'Please reset your password.' : 'You may proceed to configure 2FA if desired.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred during  register', error);
    }
  }

  public async forcePasswordReset(userId: string, dto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      // 1. Fetch the user to inspect status
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 2. Check if the user has already completed initial password reset
      if (!user.isMustResetPassword) {
        throw new BadRequestException('Initial password reset has already been completed for this account.');
      }

      // 3. Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

      // 4. Update password and flip the requirement flag
      user.password = hashedPassword;
      user.isMustResetPassword = false;
      await user.save();

      return { message: 'Password reset successfully. You may now continue using your account.' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while resetting the password', error);
    }
  }

  public async setup2FA(userId: string): Promise<any> {
    // Generate TOTP secret / QR code for post-reset 2FA activation
  }

  public async verify2FASetup(userId: string, dto: any): Promise<any> {
    // Confirm and activate 2FA for the user account
  }

  // ==========================================  Core Authentication & Session Management ==========================================

  public async login(loginDto: LoginDto): Promise<{ message: string; accessToken: string; refreshToken: string }> {
    try {
      // 1. Find user by email OR username OR userCode
      const user = await this.userModel
        .findOne({
          $or: [{ email: loginDto.loginKey }, { username: loginDto.loginKey }, { userCode: loginDto.loginKey }],
        })
        .select('+password') // Ensures hidden password field is loaded
        .exec();

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2. Compare plain-text password with stored hash
      const isPasswordValid = await this.comparePassword(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 3. Enforce password reset requirement
      if (user.isMustResetPassword) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Password reset required before first login.',
          isMustResetPassword: true,
        });
      }

      // 4. Issue access token
      const { accessToken, refreshToken } = await this.generateTokens(user);

      return {
        message: 'Login successful',
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred during login', error);
    }
  }

  /**
   * Validates Refresh Token and issues a new pair (Token Rotation).
   */
  public async refreshTokens(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // 1. Verify token signature and expiration
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'superSecretRefreshKey',
      });
      console.log('Refresh token payload:', payload);

      // 2. Fetch user with stored hashed refresh token
      const user = await this.userModel.findById(payload.sub).select('+refreshTokenHash').exec();
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Access denied. Token is invalid or session expired.');
      }

      // 3. Compare incoming refresh token with database hash
      const isRefreshTokenValid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      // 4. Generate new token pair (Token Rotation)
      return await this.generateTokens(user);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  /**
   * Removes stored Refresh Token from database to invalidate session.
   */
  public async logout(userId: string): Promise<{ message: string }> {
    try {
      await this.userModel.findByIdAndUpdate(userId, {
        $set: { refreshTokenHash: null },
      });

      return { message: 'Logged out successfully.' };
    } catch (error) {
      throw new InternalServerErrorException('An error occurred during logout.');
    }
  }
  public async validateUserCredentials(dto: any): Promise<any> {
    // Validate credentials, handle isMustResetPassword check, and 2FA state
  }

  // ========================================== todo: Machine-to-Machine & System Service ==========================================

  public async validateSystemServiceAccount(apiKey: string): Promise<any> {
    // Validate API Key / Token for POS & E-COM integrations (system_service)
  }

  // ==========================================  Password Recovery Lifecycle ==========================================

  public async forgotPassword(dto: any): Promise<void> {
    // Generate time-limited reset token & send recovery email
  }

  public async resetPassword(dto: any): Promise<void> {
    // Verify single-use reset token and update password hash
  }
  //=============================================== Private helper funcions =========================================
  public async generateAccessToken(user: any) {
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      userCode: user.userCode,
      role: user.role,
      permissions: getEffectivePermissions(user.role, user.permissions),
      isMustResetPassword: user.isMustResetPassword,
    };

    return this.jwtService.sign(payload);
  }
  /**
   * Generates both Access and Refresh tokens, then saves the hashed Refresh Token to DB.
   */
  public async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user._id || user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      // Effective permissions = role's defaults ∪ this user's individually granted extras.
      // Recomputed from the DB user on every login/refresh, so permission grants apply
      // as soon as the user gets a fresh token (no need to touch existing tokens).
      permissions: getEffectivePermissions(user.role, user.permissions),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'superSecretKey',
        expiresIn: '1h', // Short-lived access token
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'superSecretRefreshKey',
        expiresIn: '7d', // Long-lived refresh token
      }),
    ]);
    // Store hashed refresh token in database for security
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(user._id || user.id, {
      $set: { refreshTokenHash: hashedRefreshToken },
    });

    return { accessToken, refreshToken };
  }
  /**
   * Compares plain-text password with stored bcrypt hash
   */
  private async comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
