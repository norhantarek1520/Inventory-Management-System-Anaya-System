import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Permission, Role } from 'src/commons';

export class CreateUserDto {
  @ApiProperty({
    description: "The user's first name",
    example: 'Nourhan',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  first_name: string;

  @ApiProperty({
    description: "The user's last name",
    example: 'Tarek',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  last_name: string;

  @ApiProperty({
    description: 'Unique username for authentication (stored in lowercase)',
    example: 'nourhan_tarek',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Transform(({ value }) => value?.trim().toLowerCase())
  username: string;

  @ApiProperty({
    description: 'Unique email address for user login and onboarding communications',
    example: 'nourhan@anayamarket.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: 'User contact phone number with international country code',
    example: '+201012345678',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'System role defining base authorization level',
    enum: Role,
    example: Role.INVENTORY_STAFF,
  })
  @IsEnum(Role, {
    message: `role must be a valid role enum value: ${Object.values(Role).join(', ')}`,
  })
  @IsNotEmpty()
  role: Role;

  @ApiPropertyOptional({
    description:
      'Extra granular permissions to grant this user on top of their role\'s defaults (e.g. give an inventory_staff user "products:create" even though their role would not normally include it).',
    enum: Permission,
    isArray: true,
    example: [Permission.PRODUCTS_CREATE, Permission.STOCK_ADJUST],
    default: [],
  })
  @IsArray()
  @IsEnum(Permission, { each: true, message: `each permission must be one of: ${Object.values(Permission).join(', ')}` })
  @IsOptional()
  permissions?: Permission[];
}
