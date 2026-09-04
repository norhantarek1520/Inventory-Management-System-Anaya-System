import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductItemDto } from './create_product_item.dto';

/**
 * All fields become optional.
 * product_id is excluded — you cannot move an item to a different parent product.
 * added_by is never in DTOs — it is injected from the auth token by the service layer.
 */
export class UpdateProductItemDto extends PartialType(
  OmitType(CreateProductItemDto, ['product_id'] as const),
) {}
