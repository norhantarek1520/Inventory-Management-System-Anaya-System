import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents a single variant attribute, e.g.:
 *   { key: "color",   value: "Midnight Black", unit: null }
 *   { key: "storage", value: "256",            unit: "GB" }
 */
export class ProductAttributeDto {
  @ApiProperty({
    example: 'color',
    description: 'Attribute name (e.g. "color", "size", "weight", "material")',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'Midnight Black',
    description: 'Attribute value as a string',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({
    example: 'GB',
    description: 'Optional unit for numeric values (e.g. "kg", "cm", "GB"). Omit or pass null for non-numeric attributes.',
    nullable: true,
    default: null,
  })
  @IsString()
  @IsOptional()
  unit?: string | null;
}
