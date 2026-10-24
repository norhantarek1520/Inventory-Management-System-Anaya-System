/**
 * @file category.controller.ts
 * @description Category HTTP endpoints. Reference example for combining the two audit
 *              integration styles: @Audit() to refine an automatic record, and @NoAudit() +
 *              @AuditContext() to hand off to a richer service-level record.
 */

import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoryQueryDto, AuditContext, Audit, NoAudit, AuditAction, AuditResource, AuditContextData } from 'src/commons';
import { ParseObjectIdPipe } from 'node_modules/@nestjs/mongoose/dist';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  //todo: Add role and permissions for each endpint
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * HOW AUDITING IS WIRED IN THIS CONTROLLER — three distinct cases, one per pattern.
   *
   * Remember that the global AuditInterceptor records every POST/PATCH/DELETE here whether a
   * route is decorated or not. Decorators never ENABLE auditing; they only shape it.
   *
   *  1. `create` → @Audit({...})
   *     Keeps the automatic interceptor record, but labels it with a precise action and a
   *     readable description instead of the generic inferred "CREATE CATEGORY". There is no
   *     previous state to diff on a create, so the automatic record is already complete.
   *
   *  2. `update` / `remove` / `togleStatus` → @NoAudit() + @AuditContext()
   *     These hand auditing to the service, which can read the document BEFORE writing and so
   *     record an actual before/after diff. @NoAudit() stops the interceptor from adding a
   *     second, shallower row for the same event; @AuditContext() supplies the request facts
   *     the service cannot see on its own.
   *
   *  3. `findAll` / `findOne` → nothing
   *     Plain GETs are not audited at all, which is the correct default (docs §1.7).
   *     Recording every list view would bloat the collection and tell a business reader nothing.
   */

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit({
    action: AuditAction.CREATE,
    resource: AuditResource.CATEGORY,
    description: 'Created a new category',
  })
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'The category has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    // No actor passed: `create` has no previous state to diff, so the interceptor's automatic
    // record is already complete. See the note in CategoryService.
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
  // @NoAudit() because CategoryService.update() writes its own, richer record (with the
  // before/after field diff). Without this the interceptor would ALSO record the request and
  // every update would produce two half-complete rows. See the note in CategoryService.
  @NoAudit()
  @ApiOperation({ summary: 'Update a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The category has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    // @AuditContext() bundles the actor (from `request.user`, populated by JwtAuthGuard) with
    // the request context — IP, user-agent, method, endpoint, correlation id. This is how the
    // "WHO" and "WHERE" reach a service, which cannot see the HTTP request itself.
    @AuditContext() ctx: AuditContextData,
  ) {
    return await this.categoryService.update(id, updateCategoryDto, ctx);
  }
  //==============================================================================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  // Service-level audit: it stores the ENTIRE deleted document as before_state, which the
  // interceptor cannot do. @NoAudit() keeps it to a single record.
  @NoAudit()
  @ApiOperation({ summary: 'Delete a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The category has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async remove(@Param('id', ParseObjectIdPipe) id: string, @AuditContext() ctx: AuditContextData) {
    return await this.categoryService.remove(id, ctx);
  }
  //==============================================================================================

  @Patch(':id/toggle-status')
  // Service-level audit, recorded as TOGGLE_STATUS rather than the generic UPDATE the
  // interceptor would infer from the PATCH verb — so "who deactivated this category?" stays
  // answerable instead of being buried among every other kind of update.
  @NoAudit()
  @ApiOperation({ summary: 'Update a Category Status by ID' })
  @ApiParam({ name: 'id', description: 'Category ObjectId' })
  @ApiResponse({ status: 200, description: 'The Category status has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async togleStatus(@Param('id', ParseObjectIdPipe) id: string, @AuditContext() ctx: AuditContextData) {
    return await this.categoryService.togleStatus(id, ctx);
  }
}
