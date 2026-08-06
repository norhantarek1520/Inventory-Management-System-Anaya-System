import { HttpException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDto } from 'src/commons/dtos/auth';
import * as bcrypt from 'bcryptjs';
import { ResetPasswordDto } from 'src/commons/dtos/auth/reset_password.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/commons/schema/user.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  //================== 1. User Register & Onboarding Flow ==========================================

  public async registerUser(registerDto: RegisterDto) {
    try {
      // 1. Find user by email and username
      const user = await this.userModel.findOne({ email: registerDto.email }).exec();
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
      // 1. Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

      // 2. Update user document in database
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            $set: {
              password: hashedPassword,
              isMustResetPassword: false,
            },
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User not found`);
      }

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

  // ========================================== 2. Core Authentication & Session Management ==========================================

  public async login(user: any): Promise<any> {
    // Primary login handler issuing Access and Refresh JWT tokens
  }

  public async refreshTokens(refreshToken: string): Promise<any> {
    // Refresh token rotation mechanism
  }

  public async logout(userId: string, refreshToken: string): Promise<void> {
    // Invalidate active session/refresh tokens
  }
  public async validateUserCredentials(dto: any): Promise<any> {
    // Validate credentials, handle isMustResetPassword check, and 2FA state
  }

  // ========================================== 3. Machine-to-Machine & System Service ==========================================

  public async validateSystemServiceAccount(apiKey: string): Promise<any> {
    // Validate API Key / Token for POS & E-COM integrations (system_service)
  }

  // ========================================== 4. Password Recovery Lifecycle ==========================================

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
      isMustResetPassword: user.isMustResetPassword,
    };

    return this.jwtService.sign(payload);
  }
  /**
   * Compares plain-text password with stored bcrypt hash
   */
  private async comparePassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
