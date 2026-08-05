import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from 'src/commons';

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
    description: 'Array of custom granular permission strings assigned to override/extend default role permissions',
    example: ['products:create', 'stock:adjust', 'reports:read'],
    type: [String],
    default: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
