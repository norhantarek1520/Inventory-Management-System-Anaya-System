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
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, GetProductQueryDto } from 'src/commons';
import { CurrentUser, Permissions, Permission } from 'src/commons';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  POST /product
  // ═══════════════════════════════════════════════════════════════════════════

  @Post()
  @Permissions(Permission.PRODUCTS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a product linked to one (or two) sub-categories. ' +
      'The authenticated user\'s ID is automatically stored as "added_by".',
  })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid sub-category reference.' })
  @ApiResponse({ status: 403, description: 'Referenced sub-category is inactive.' })
  @ApiResponse({ status: 404, description: 'Referenced sub-category not found.' })
  @ApiResponse({ status: 409, description: 'Product code already exists.' })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('userId') userId: string,
  ) {
    return await this.productService.create(createProductDto, userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GET /product
  // ═══════════════════════════════════════════════════════════════════════════

  @Get()
  @Permissions(Permission.PRODUCTS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Returns a paginated list of products with optional filters: sub-category, added_by, active status, and keyword search.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of products returned.' })
  async findAll(@Query() query?: GetProductQueryDto) {
    return await this.productService.findAll(query);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GET /product/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id')
  @Permissions(Permission.PRODUCTS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productService.findOne(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PATCH /product/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Patch(':id')
  @Permissions(Permission.PRODUCTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a product by ID',
    description: 'Partially updates product fields. Sub-category references are re-validated on change.',
  })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid body or ObjectId.' })
  @ApiResponse({ status: 404, description: 'Product or referenced sub-category not found.' })
  @ApiResponse({ status: 409, description: 'Product code conflict.' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productService.update(id, updateProductDto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PATCH /product/:id/toggle-status
  // ═══════════════════════════════════════════════════════════════════════════

  @Patch(':id/toggle-status')
  @Permissions(Permission.PRODUCTS_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle the active status of a product' })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product status toggled.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async toggleStatus(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productService.toggleStatus(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DELETE /product/:id
  // ═══════════════════════════════════════════════════════════════════════════

  @Delete(':id')
  @Permissions(Permission.PRODUCTS_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a product permanently',
    description:
      'Hard-deletes the product. Use with caution — prefer toggle-status to deactivate ' +
      'a product rather than removing it permanently.',
  })
  @ApiParam({ name: 'id', description: 'Product MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Product deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.productService.remove(id);
  }
}
