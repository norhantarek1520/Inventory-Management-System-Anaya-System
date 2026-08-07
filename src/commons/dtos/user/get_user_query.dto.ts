import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Role } from 'src/commons';

export class GetUserQueryDto {
  @ApiPropertyOptional({
    description: 'Search term across first_name, last_name, username, email, phone, or userCode',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter users by Role',
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description: 'Filter by password reset status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMustResetPassword?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by 2FA status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTwoFactorEnabled?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
