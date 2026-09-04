import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';
import { ProductItemService } from './product_item.service';
import {
  CreateProductItemDto,
  UpdateProductItemDto,
  GetProductItemQueryDto,
} from 'src/commons';
import { CurrentUser, Permissions, Permission } from 'src/commons';

@ApiTags('Product Items')
@Controller('product-item')
export class ProductItemController {
  constructor(private readonly productItemService: ProductItemService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  POST /product-item
  // ═══════════════════════════════════════════════════════════════════════════

  @Post()
  @Permissions(Permission.PRODUCTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product item (variant)',
    description:
      'Adds a variant to an existing product. ' +
      'Use the "attributes" array to describe what makes this variant unique ' +
      '(color, size, storage, material, etc.). ' +
      'The authenticated user\'s ID is automatically stored as "added_by".',
  })
  @ApiResponse({ status: 201, description: 'Product item created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error or parent product is inactive.' })
  @ApiResponse({ status: 404, description: 'Parent product not found.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  async create(
    @Body() createProductItemDto: CreateProductItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return await this.productItemService.create(createProductItemDto, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GET /product-item
  // ═══════════════════════════════════════════════════════════════════════════

  @Get()
  @Permissions(Permission.PRODUCTS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all product items',
    description:
      'Returns a paginated list of product items. ' +
      'Filter by product, user, status, SKU search, or low-stock flag.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of product items.' })
  async findAll(@Query() query?: GetProductItemQueryDto) {
    return await this.productItemService.findAll(query);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GET /product-item/by-product/:productId
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('by-product/:productId')
  @Permissions(Permission.PRODUCTS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all items for a specific product',
    description: 'Convenience endpoint — returns all variants of a given parent product.',
  })
  @ApiParam({ name: 'productId', description: 'Parent product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'List of product items for the given product.' })
  @ApiResponse({ status: 404, description: 'Parent product not found.' })
  async findByProduct(@Param('productId', ParseObjectIdPipe) productId: string) {
    return await this.productItemService.findByProduct(productId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GET /product-item/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id')
  @Permissions(Permission.PRODUCTS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a product item by ID' })
  @ApiParam({ name: 'id', description: 'ProductItem MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product item found.' })
  @ApiResponse({ status: 404, description: 'Product item not found.' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productItemService.findOne(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PATCH /product-item/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Patch(':id')
  @Permissions(Permission.PRODUCTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a product item by ID',
    description: 'Partially updates any field except product_id (variants cannot be re-parented).',
  })
  @ApiParam({ name: 'id', description: 'ProductItem MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product item updated.' })
  @ApiResponse({ status: 404, description: 'Product item not found.' })
  @ApiResponse({ status: 409, description: 'SKU conflict.' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateProductItemDto: UpdateProductItemDto,
  ) {
    return await this.productItemService.update(id, updateProductItemDto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PATCH /product-item/:id/toggle-status
  // ═══════════════════════════════════════════════════════════════════════════

  @Patch(':id/toggle-status')
  @Permissions(Permission.PRODUCTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle the active/inactive status of a product item' })
  @ApiParam({ name: 'id', description: 'ProductItem MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Status toggled.' })
  @ApiResponse({ status: 404, description: 'Product item not found.' })
  async toggleStatus(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productItemService.toggleStatus(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DELETE /product-item/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Delete(':id')
  @Permissions(Permission.PRODUCTS_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete a product item',
    description: 'Hard-deletes the variant. Prefer toggle-status to deactivate instead.',
  })
  @ApiParam({ name: 'id', description: 'ProductItem MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product item deleted.' })
  @ApiResponse({ status: 404, description: 'Product item not found.' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productItemService.remove(id);
  }
}
