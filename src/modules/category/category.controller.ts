import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoryQueryDto } from 'src/commons';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  //todo: Add role and permissions for each endpint
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'The category has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return await this.categoryService.create(createCategoryDto);
  }
  //==============================================================================================

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  async findAll(@Query() dto?: GetCategoryQueryDto) {
    return await this.categoryService.findAll(dto);
  }

  //==============================================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'Return the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.categoryService.findOne(id);
  }
  //==============================================================================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The category has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async update(@Param('id', ParseObjectIdPipe) id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return await this.categoryService.update(id, updateCategoryDto);
  }
  //==============================================================================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The category has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.categoryService.remove(id);
  }
  //==============================================================================================
  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Update a Category Status by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The Category status has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async togleStatus(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.categoryService.togleStatus(id);
  }
}
