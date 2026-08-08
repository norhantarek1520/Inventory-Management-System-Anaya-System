import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from 'src/commons/schema';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoryQueryDto } from 'src/commons';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>) {}

  public async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const createdCategory = new this.categoryModel(createCategoryDto);
      return await createdCategory.save();
    } catch (error) {
      throw error;
    }
  }
  //==============================================================================================

  public async findAll(getCategoryQueryDto?: GetCategoryQueryDto): Promise<Category[]> {
    const filter: any = {};

    if (getCategoryQueryDto) {
      // 1. Filter by active/inactive status if provided
      if (getCategoryQueryDto.is_active !== undefined) {
        filter.is_active = getCategoryQueryDto.is_active;
      }

      // 2. Filter by search keyword matching name or category_code (case-insensitive)
      if (getCategoryQueryDto.search) {
        filter.$or = [
          { name: { $regex: getCategoryQueryDto.search, $options: 'i' } },
          { category_code: { $regex: getCategoryQueryDto.search, $options: 'i' } },
        ];
      }
    }

    // 3. Handle Pagination calculations (defaults to page 1, limit 10 via DTO properties)
    const page = getCategoryQueryDto?.page ?? 1;
    const limit = getCategoryQueryDto?.limit ?? 10;
    const skip = (page - 1) * limit;

    return await this.categoryModel.find(filter).skip(skip).limit(limit).exec();
  }
  //==============================================================================================

  public async findOne(id: string): Promise<Category> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }
  //==============================================================================================

  public async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true, runValidators: true }).exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updatedCategory;
  }
  //==============================================================================================
  public async remove(id: string): Promise<{ message: string }> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return { message: 'Category successfully deleted' };
  }
  //==============================================================================================
  public async togleStatus(id: string) {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, { is_active: !true }, { new: true, runValidators: true }).exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updatedCategory;
  }
  //==============================================================================================
  //========================================== Private helper funcions====================================================
}
