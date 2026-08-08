import { IsString, IsNotEmpty, IsBoolean, IsOptional, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'C001',
    description: 'Unique category code following the format C001, C002, etc.',
    pattern: '^C\\d{3}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^C\d{3}$/, { message: 'Category code must be in the format C001, C002, ...' })
  category_code: string;

  @ApiProperty({
    example: 'Electronics',
    description: 'Name of the category',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'All electronic gadgets and devices',
    description: 'Detailed description of the category',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates if the category is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
