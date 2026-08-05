import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto, GetUserQueryDto, UpdateUserDto } from 'src/commons/dtos';
import { User, UserDocument } from 'src/commons/schema/user.schema';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcryptjs';
@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Creates a new user record in the database
   */
  public async createUser(createUserDto: CreateUserDto): Promise<Partial<User>> {
    console.log('⚡Creating user ');
    // 1. Check for unique constraints beforehand (Email & Username)
    await this.isUserExist(createUserDto);
    // 2. Generate unique user code
    const userCode = await this.generateUserCode();

    // 3. Generate temporary password using userCode & username ending with @
    const tempPassword = this.generateTempPassword(userCode, createUserDto.username);

    // 4. Hash temporary password
    const hashedPassword = await this.hashPassword(tempPassword);

    try {
      // 5. Create user instance
      console.log('starting to create new user instance...');
      const newUser = new this.userModel({
        ...createUserDto,
        userCode,
        password: hashedPassword,
        isMustResetPassword: true, // Force reset on first login
      });

      // 6. Save to database
      const savedUser = await newUser.save();

      // 7. Send onboarding email with clear-text temp password
      // await this.sendOnboardingEmail(savedUser, tempPassword);

      // 8. Return response object excluding sensitive data
      const userObject = savedUser.toObject();
      delete userObject.password;
      delete userObject.refreshTokenHash;
      delete userObject.twoFactorSecret;

      return userObject;
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while creating the user , The error is :',
        error,
      );
    }
  }

  /**
   * Fetch users with search, multi-field filtering, pagination, and total count.
   */
  public async getAllUsers(queryDto?: GetUserQueryDto): Promise<{
    users: Partial<User>[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10 } = queryDto || {};

      // 1. Build MongoDB filter using private helper
      const filter = this.buildUserFilterQuery(queryDto);

      // 2. Compute pagination metrics
      const skip = (page - 1) * limit;

      // 3. Execute count and find queries in parallel
      const [users, totalCount] = await Promise.all([
        this.userModel
          .find(filter)
          .select('-password -refreshTokenHash -twoFactorSecret')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      return {
        users,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while fetching all users', error);
    }
  }

  /**
   * Get single user by ID (excludes internal security fields)
   */
  public async getUserById(id: string): Promise<Partial<User>> {
    try {
      const user = await this.userModel
        .findById(id)
        .select('-password -refreshTokenHash -twoFactorSecret')
        .exec();

      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while fetching the user', error);
    }
  }

  /**
   * Update user details and return updated document
   */
  public async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    try {
      //1. Check for duplicate email or phone if they are being updated
      await this.checkDuplicateEmailOrPhone(updateUserDto.email, updateUserDto.phone, id);

      // 2. Perform partial update using $set
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, { $set: updateUserDto }, { new: true, runValidators: true })
        .select('-password -refreshTokenHash -twoFactorSecret')
        .exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('An error occurred while updating the user', error);
    }
  }

  /**
   * Delete user by ID
   */
  public async deleteUser(id: string): Promise<void> {
    try {
      const deletedUser = await this.userModel.findByIdAndDelete(id).exec();

      if (!deletedUser) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while deleting the user', error);
    }
  }

  /**
   * Reset the entire user database by deleting all user records.
   * Returns the count of deleted records.
   */
  public async resetAllUser(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.userModel.deleteMany({}).exec();
      return { deletedCount: result.deletedCount };
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while resetting the user database',
        error,
      );
    }
  }

  // ========================================== Private Helpers & Utilities ==========================================

  /**
   * Checks if a user with the same email, username, or phone already exists in the database.
   * Throws a ConflictException if any of these fields are already in use.
   */
  private async isUserExist(userData: CreateUserDto) {
    const existingUser = await this.userModel
      .findOne({
        $or: [
          { email: userData.email },
          { username: userData.username },
          { phone: userData.phone },
        ],
      })
      .exec();

    if (existingUser) {
      if (existingUser.username === userData.username) {
        console.log('Username already exists:', userData.username);
        throw new ConflictException('Username is already in use.');
      }
      if (existingUser.email === userData.email) {
        console.log('Email already exists:', userData.email);
        throw new ConflictException('Email address is already in use.');
      }
      if (existingUser.phone === userData.phone) {
        console.log('Phone number already exists:', userData.phone);
        throw new ConflictException('Phone number address is already in use.');
      }
    }

    return true;
  }

  private async checkDuplicateEmailOrPhone(email: string, phone: string, id: any) {
    // 1. Check if email or phone is already taken by ANOTHER user
    if (email || phone) {
      const existingUser = await this.userModel
        .findOne({
          _id: { $ne: id }, // Exclude the current user being updated
          $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
        })
        .exec();

      if (existingUser) {
        if (email && existingUser.email === email) {
          throw new ConflictException('Email address is already in use by another account.');
        }
        if (phone && existingUser.phone === phone) {
          throw new ConflictException('Phone number is already in use by another account.');
        }
      }
    }
  }
  /**
   * Generates a unique user code in the format EMP-XXXX (e.g., EMP-4829)
   */
  private async generateUserCode(): Promise<string> {
    console.log('Generating unique user code...');
    let userCode: string;
    let isUnique = false;

    // Retry loop to ensure collision avoidance in the DB
    while (!isUnique) {
      const random4Digits = Math.floor(1000 + Math.random() * 9000);
      userCode = `EMP-${random4Digits}`;

      const existingUser = await this.userModel.findOne({ userCode }).exec();
      if (!existingUser) {
        isUnique = true;
      }
    }

    return userCode;
  }

  /**
   * Generates a temporary password combining userCode, username, and ending with @
   * Format: <userCode><username>@ (e.g., EMP-4829johndoe@)
   */
  private generateTempPassword(userCode: string, username: string): string {
    return `${userCode}${username}@`;
  }

  /**
   * Hashes plain text passwords using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    console.log('Hashing password...');
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Helper to handle sending welcome email (integrate with your MailerService)
   */
  private async sendOnboardingEmail(user: UserDocument, tempPassword: string): Promise<void> {
    // TODO: Connect to your MailerService (e.g., NestJS @nestjs-modules/mailer, SendGrid, Resend)
    // Example logic:
    // await this.mailerService.sendMail({
    //   to: user.email,
    //   subject: 'Welcome! Your Account Details',
    //   template: './onboarding',
    //   context: {
    //     name: user.first_name,
    //     username: user.username,
    //     tempPassword: tempPassword,
    //   },
    // });
    console.log(`[ONBOARDING EMAIL] Sent to ${user.email} with temp password: ${tempPassword}`);
  }

  /**
   * Builds dynamic Mongoose FilterQuery based on GetUserQueryDto input.
   */
  private buildUserFilterQuery(queryDto?: GetUserQueryDto): Record<string, any> {
    const { search, role, isMustResetPassword, isTwoFactorEnabled } = queryDto || {};
    const filter: Record<string, any> = {};

    if (role) filter.role = role;
    if (isMustResetPassword !== undefined) filter.isMustResetPassword = isMustResetPassword;
    if (isTwoFactorEnabled !== undefined) filter.isTwoFactorEnabled = isTwoFactorEnabled;

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { first_name: searchRegex },
        { last_name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { userCode: searchRegex },
      ];
    }

    return filter;
  }
}
