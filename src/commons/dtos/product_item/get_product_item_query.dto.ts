import { IsString, IsOptional, IsBoolean, IsInt, Min, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetProductItemQueryDto {
  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'Filter items belonging to a specific parent product (ObjectId)',
  })
  @IsMongoId()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a3',
    description: 'Filter items added by a specific user (ObjectId)',
  })
  @IsMongoId()
  @IsOptional()
  added_by?: string;

  @ApiPropertyOptional({
    example: 'SKU-AB12',
    description: 'Search keyword matched against SKU',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active/inactive status',
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'When true, only return items with quantity_in_stock <= low_stock_threshold',
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  low_stock_only?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
