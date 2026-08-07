import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "The user's first name", example: 'Nourhan' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  first_name?: string;

  @ApiPropertyOptional({ description: "The user's last name", example: 'Tarek' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  last_name?: string;

  @ApiPropertyOptional({ description: 'Unique email address', example: 'nourhan@anayamarket.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional({ description: 'User contact phone number', example: '+201012345678' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
