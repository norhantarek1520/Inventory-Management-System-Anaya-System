import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches, MaxLength, MinLength, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubCategoryDto {
  @ApiProperty({
    example: 'SC001',
    description: 'Unique subcategory code following the format SC001, SC002, etc.',
    pattern: '^SC\\d{3}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^SC\d{3}$/, { message: 'Subcategory code must be in the format SC001, SC002, ...' })
  subcategory_code: string;

  @ApiProperty({
    example: 'Smartphones',
    description: 'Name of the subcategory',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'MongoDB ObjectId of the parent category',
  })
  @IsMongoId({ message: 'parent_category_id must be a valid MongoDB ObjectId' })
  @IsNotEmpty()
  parent_category_id: string;

  @ApiPropertyOptional({
    example: 'Mobile phones and smartphones',
    description: 'Detailed description of the subcategory',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates if the subcategory is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
