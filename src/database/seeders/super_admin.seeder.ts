import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from 'src/commons/schema/user.schema';
import { Permission, Role } from 'src/commons';

/**
 * Seeds the default super_admin account on every app bootstrap.
 * Safe to run repeatedly — it checks for an existing user (by email/username)
 * before inserting, so it never creates duplicates or overwrites an existing account.
 */
@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  // Hardcoded seed data for the initial system owner account
  private readonly seedUser = {
    first_name: 'Nourhan',
    last_name: 'Tarek',
    username: 'norhantarek1520',
    userCode: 'EMP-1520',
    email: 'norhantarek1520@gmail.com',
    phone: '+201055409230',
    role: Role.SUPER_ADMIN,
    isMustResetPassword: false,
    isTwoFactorEnabled: false,
    plainPassword: 'EMP-norhantarek1520@',
  };

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  private async seed() {
    try {
      const existingUser = await this.userModel
        .findOne({ $or: [{ email: this.seedUser.email }, { username: this.seedUser.username }, { userCode: this.seedUser.userCode }] })
        .exec();

      if (existingUser) {
        this.logger.log(`Super admin "${this.seedUser.username}" already exists — skipping seed.`);
        return;
      }

      const hashedPassword = await bcrypt.hash(this.seedUser.plainPassword, 10);

      await this.userModel.create({
        first_name: this.seedUser.first_name,
        last_name: this.seedUser.last_name,
        username: this.seedUser.username,
        userCode: this.seedUser.userCode,
        email: this.seedUser.email,
        phone: this.seedUser.phone,
        role: this.seedUser.role,
        permissions: Object.values(Permission), // super_admin gets every permission in the system
        isMustResetPassword: this.seedUser.isMustResetPassword,
        isTwoFactorEnabled: this.seedUser.isTwoFactorEnabled,
        password: hashedPassword,
      });

      this.logger.log(`✅ Super admin user "${this.seedUser.username}" (${this.seedUser.email}) seeded successfully.`);
    } catch (error) {
      this.logger.error('❌ Failed to seed super admin user', error);
    }
  }
}
