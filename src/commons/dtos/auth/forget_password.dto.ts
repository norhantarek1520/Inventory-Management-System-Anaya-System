import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgetPasswordDto {
  @ApiProperty({
    description: 'Unique email address for user login and onboarding communications',
    example: 'nourhan@anayamarket.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}
