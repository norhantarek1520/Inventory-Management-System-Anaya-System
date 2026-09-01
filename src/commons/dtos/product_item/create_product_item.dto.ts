import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Matches,
  IsMongoId,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  Min,
  IsUrl,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductAttributeDto } from './product_attribute.dto';

export class CreateProductItemDto {
  // ─── Relationship ───────────────────────────────────────────────────────────

  @ApiProperty({
    example: '60c72b2f9b1d8b2d88f3e4a1',
    description: 'MongoDB ObjectId of the parent product this item belongs to',
  })
  @IsMongoId({ message: 'product_id must be a valid MongoDB ObjectId' })
  @IsNotEmpty()
  product_id: string;

  // ─── Identification ─────────────────────────────────────────────────────────

  @ApiProperty({
    example: 'SKU-AB12CD34',
    description: 'Unique SKU in the format SKU-XXXXXXXX (8 uppercase alphanumeric chars)',
    pattern: '^SKU-[A-Z0-9]{8}$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^SKU-[A-Z0-9]{8}$/, {
    message: 'SKU must follow the format SKU-XXXXXXXX (e.g. SKU-AB12CD34)',
  })
  sku: string;

  // ─── Flexible variant attributes ────────────────────────────────────────────

  @ApiProperty({
    description:
      'One or more key/value/unit attribute objects that distinguish this variant ' +
      '(e.g. color, size, storage, material). At least one is required.',
    type: [ProductAttributeDto],
    example: [
      { key: 'color', value: 'Midnight Black', unit: null },
      { key: 'storage', value: '256', unit: 'GB' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one attribute is required to describe this variant' })
  @ArrayMaxSize(20, { message: 'A product item can have at most 20 attributes' })
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes: ProductAttributeDto[];

  // ─── Metadata (free-form) ───────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'Free-form JSON object for any extra data not covered by attributes — ' +
      'e.g. supplier codes, warranty info, integration-specific fields.',
    example: { supplier_sku: 'SUP-9981', origin: 'CN', warranty_months: 12 },
    default: {},
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  // ─── Pricing ────────────────────────────────────────────────────────────────

  @ApiProperty({
    example: 999.99,
    description: 'Selling price of this variant (must be ≥ 0)',
  })
  @IsNumber()
  @Min(0, { message: 'price must be a non-negative number' })
  price: number;

  @ApiPropertyOptional({
    example: 1199.99,
    description: 'Original / crossed-out price for sale display. Leave null if not on sale.',
    nullable: true,
    default: null,
  })
  @IsNumber()
  @Min(0, { message: 'compare_at_price must be a non-negative number' })
  @IsOptional()
  compare_at_price?: number | null;

  // ─── Stock ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: 150,
    description: 'Initial quantity in stock (defaults to 0)',
    default: 0,
  })
  @IsNumber()
  @Min(0, { message: 'quantity_in_stock must be a non-negative integer' })
  @IsOptional()
  quantity_in_stock?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Trigger a low-stock alert when quantity falls to this level (defaults to 0 = disabled)',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  low_stock_threshold?: number;

  // ─── Media ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: ['https://cdn.example.com/items/sku-ab12cd34-front.jpg'],
    description: 'Variant-specific image URLs (overrides the parent product images in UI)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(10, { message: 'A product item can have at most 10 images' })
  @IsUrl({}, { each: true, message: 'Each image entry must be a valid URL' })
  images?: string[];

  // ─── Status ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this variant is active and visible in listings',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
