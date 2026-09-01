import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
  IsMongoId,
  IsArray,
  ArrayMaxSize,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  // ─── Identification ─────────────────────────────────────────────────────────

  @ApiProperty({
    example: 'P0001',
    description: 'Unique product code in the format P0001, P0002, …',
    pattern: '^P\\d{4}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^P\d{4}$/, { message: 'product_code must be in the format P0001, P0002, ...' })
  product_code: string;

  @ApiProperty({
    example: 'Samsung Galaxy S24',
    description: 'Product display name',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    example: 'Latest flagship smartphone from Samsung.',
    description: 'Detailed product description',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  // ─── Classification ──────────────────────────────────────────────────────────

  @ApiProperty({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'MongoDB ObjectId of the primary sub-category this product belongs to',
  })
  @IsMongoId({ message: 'primary_subcategory_id must be a valid MongoDB ObjectId' })
  @IsNotEmpty()
  primary_subcategory_id: string;

  @ApiPropertyOptional({
    example: '60c72b2f9b1d8b2d88f3e4a2',
    description:
      'MongoDB ObjectId of a secondary sub-category (cross-listing). Must differ from primary_subcategory_id.',
  })
  @IsMongoId({ message: 'secondary_subcategory_id must be a valid MongoDB ObjectId' })
  @IsOptional()
  @ValidateIf((o) => o.secondary_subcategory_id !== null && o.secondary_subcategory_id !== undefined)
  secondary_subcategory_id?: string;

  // ─── Media ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/images/product1.jpg'],
    description: 'Array of image URLs for this product (max 10)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10, { message: 'A product can have at most 10 images' })
  @IsUrl({}, { each: true, message: 'Each image entry must be a valid URL' })
  images?: string[];

  // ─── Status ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the product is active (visible in listings)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
