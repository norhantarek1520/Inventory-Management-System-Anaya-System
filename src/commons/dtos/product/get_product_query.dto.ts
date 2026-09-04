import { IsString, IsOptional, IsBoolean, IsInt, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetProductQueryDto {
  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'Filter products belonging to a specific primary sub-category (ObjectId)',
  })
  @IsMongoId()
  @IsOptional()
  primary_subcategory_id?: string;

  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a2',
    description: 'Filter products belonging to a specific secondary sub-category (ObjectId)',
  })
  @IsMongoId()
  @IsOptional()
  secondary_subcategory_id?: string;

  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a3',
    description: 'Filter products added by a specific user (ObjectId)',
  })
  @IsMongoId()
  @IsOptional()
  added_by?: string;

  @ApiPropertyOptional({
    example: 'Samsung',
    description: 'Search keyword to match against product name or product_code',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter products by active/inactive status',
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    default: 10,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
