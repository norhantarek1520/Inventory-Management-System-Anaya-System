import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema, SubCategory, SubCategorySchema } from 'src/commons';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      // Needed by ProductService to validate sub-category references
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService], // Export so other modules (e.g. ProductItem) can inject it
})
export class ProductModule {}
