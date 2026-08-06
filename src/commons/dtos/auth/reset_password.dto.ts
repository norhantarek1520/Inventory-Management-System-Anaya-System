import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from 'src/commons/decorators';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New password (min 6 chars, uppercase, lowercase, number, special char)',
    example: 'P@ssw0rd123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'P@ssw0rd123',
  })
  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'Confirm password must match password' })
  confirmPassword: string;
}
