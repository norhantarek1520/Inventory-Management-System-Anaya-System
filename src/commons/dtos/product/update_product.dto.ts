import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create_product.dto';

/**
 * All fields from CreateProductDto become optional.
 * added_by is intentionally excluded — it is set once at creation time
 * by the service layer from the authenticated user's ID and cannot be changed.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
