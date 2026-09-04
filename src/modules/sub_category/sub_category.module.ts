import { Module } from '@nestjs/common';
import { MongooseModule } from 'node_modules/@nestjs/mongoose/dist';
import { Category, CategorySchema, SubCategory, SubCategorySchema } from 'src/commons';
import { SubCategoryController } from './sub_category.controller';
import { SubCategoryService } from './sub_category.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
  ],
  controllers: [SubCategoryController],
  providers: [SubCategoryService],
})
export class SubCategoryModule {}
