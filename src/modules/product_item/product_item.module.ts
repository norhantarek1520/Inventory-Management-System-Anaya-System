import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductItem,
  ProductItemSchema,
  Product,
  ProductSchema,
} from 'src/commons';
import { ProductItemController } from './product_item.controller';
import { ProductItemService } from './product_item.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductItem.name, schema: ProductItemSchema },
      // Needed by ProductItemService to validate the parent product reference
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProductItemController],
  providers: [ProductItemService],
  exports: [ProductItemService],
})
export class ProductItemModule {}
