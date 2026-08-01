import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from 'src/commons';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  // --- Personal Information ---
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  userCode: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  // --- Role & Permissions ---
  @Prop({
    required: true,
    type: String,
    enum: Object.values(Role),
    default: Role.INVENTORY_STAFF,
  })
  role: Role;

  @Prop({ type: [String], default: [] })
  permissions: string[]; // e.g., ["products:create", "reports:read"]

  // --- Onboarding & Security Flags ---

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: true })
  isMustResetPassword: boolean; // Forces password update on first login

  @Prop({ default: false })
  isTwoFactorEnabled: boolean;

  @Prop({ type: String, select: false })
  twoFactorSecret?: string; // Encrypted TOTP secret

  @Prop({ type: String, select: false })
  refreshTokenHash?: string; // Hashed refresh token for active session verification
}

export const UserSchema = SchemaFactory.createForClass(User);
