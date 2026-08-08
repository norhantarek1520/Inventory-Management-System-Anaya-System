import { PartialType } from '@nestjs/swagger';
import { CreateSubCategoryDto } from './create_subcategory.dto';

export class UpdateSubCategoryDto extends PartialType(CreateSubCategoryDto) {}
