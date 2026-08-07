import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductItemModule } from '../product_item/product_item.module';
import { ProductItemController } from '../product_item/product_item.controller';
import { ProductItemService } from '../product_item/product_item.service';

@Module({
  controllers: [ProductController, ProductItemController],
  providers: [ProductService, ProductItemService],
  imports: [ProductItemModule],
})
export class ProductModule {}
