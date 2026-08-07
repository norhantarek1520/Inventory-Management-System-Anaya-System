import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { SubCategoryModule } from '../sub_category/sub_category.module';
import { SubCategoryController } from '../sub_category/sub_category.controller';
import { SubCategoryService } from '../sub_category/sub_category.service';
import { ProductModule } from '../product/product.module';

@Module({
  controllers: [CategoryController, SubCategoryController],
  providers: [CategoryService, SubCategoryService],
  imports: [SubCategoryModule, ProductModule],
})
export class CategoryModule {}
