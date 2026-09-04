import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SubCategoryService } from './sub_category.service';
import { CreateSubCategoryDto, GetSubCategoryQueryDto, UpdateSubCategoryDto } from 'src/commons';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';

@ApiTags('Sub-category')
@Controller('sub-category')
export class SubCategoryController {
  //todo: Add role and permissions for each endpint
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new SubCategory' })
  @ApiResponse({ status: 201, description: 'The SubCategory has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return await this.subCategoryService.create(createSubCategoryDto);
  }
  //==============================================================================================

  @Get()
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiResponse({ status: 200, description: 'Return all subcategories.' })
  async findAll(@Query() dto?: GetSubCategoryQueryDto) {
    return await this.subCategoryService.findAll(dto);
  }

  //==============================================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get a SubCategory by ID' })
  @ApiParam({ name: 'id', description: 'SubCategory ObjectId' })
  @ApiResponse({ status: 200, description: 'Return the SubCategory.' })
  @ApiResponse({ status: 404, description: 'SubCategory not found.' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.subCategoryService.findOne(id);
  }
  //==============================================================================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update a SubCategory by ID' })
  @ApiParam({ name: 'id', description: 'SubCategory ObjectId' })
  @ApiResponse({ status: 200, description: 'The SubCategory has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'SubCategory not found.' })
  async update(@Param('id', ParseObjectIdPipe) id: string, @Body() updateSubCategoryDto: UpdateSubCategoryDto) {
    return await this.subCategoryService.update(id, updateSubCategoryDto);
  }
  //==============================================================================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a SubCategory by ID',
    description:
      'The SubCategory will be deleted permanently, so this is not option for any one , \
       beacuse if the SubCategory has been deleted it will have alote of missing proudct ,\
       so we use this endpint in rare times only for super amidn',
  })
  @ApiParam({ name: 'id', description: 'SubCategory ObjectId' })
  @ApiResponse({ status: 200, description: 'The SubCategory has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'SubCategory not found.' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.subCategoryService.remove(id);
  }
  //==============================================================================================
  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Update a SubCategory Status by ID' })
  @ApiParam({ name: 'id', description: 'SubCategory ObjectId' })
  @ApiResponse({ status: 200, description: 'The SubCategory status has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'SubCategory not found.' })
  async togleStatus(@Param('id', ParseObjectIdPipe) id: string) {
    return await this.subCategoryService.togleStatus(id);
  }
}
