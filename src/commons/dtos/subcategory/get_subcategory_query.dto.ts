import { IsString, IsOptional, IsBoolean, IsInt, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetSubCategoryQueryDto {
  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'Filter subcategories belonging to a specific parent category ObjectId',
  })
  @IsMongoId()
  @IsOptional()
  parent_category_id?: string;

  @ApiPropertyOptional({
    example: 'Smartphones',
    description: 'Search string to filter subcategories by name or code',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter subcategories by active or inactive status',
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
