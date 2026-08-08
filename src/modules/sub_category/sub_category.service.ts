import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubCategory, SubCategoryDocument } from 'src/commons/schema'; // Adjust path if needed
import { Category, CategoryDocument } from 'src/commons/schema'; // Adjust path if needed
import { CreateSubCategoryDto, UpdateSubCategoryDto, GetSubCategoryQueryDto } from 'src/commons'; // Adjust path if needed

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectModel(SubCategory.name) private readonly subCategoryModel: Model<SubCategoryDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  public async create(createSubCategoryDto: CreateSubCategoryDto): Promise<SubCategory> {
    try {
      //  Validate that the parent category actually exists in the database
      const parentCategory = await this.categoryModel.findById(createSubCategoryDto.parent_category_id).exec();
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${createSubCategoryDto.parent_category_id} not found`);
      }

      // Create and save the subcategory
      const createdSubCategory = new this.subCategoryModel(createSubCategoryDto);
      if (!createdSubCategory) {
        throw new ConflictException('Subcategory code or name already exists within this category.');
      }
      return await createdSubCategory.save();
    } catch (error) {
      throw error;
    }
  }
  //==============================================================================================

  public async findAll(getSubCategoryQueryDto?: GetSubCategoryQueryDto): Promise<SubCategory[]> {
    const filter: any = {};

    if (getSubCategoryQueryDto) {
      // Filter by parent category if provided
      if (getSubCategoryQueryDto.parent_category_id) {
        if (!Types.ObjectId.isValid(getSubCategoryQueryDto.parent_category_id)) {
          throw new BadRequestException('Invalid parent_category_id filter format');
        }
        filter.parent_category_id = new Types.ObjectId(getSubCategoryQueryDto.parent_category_id);
      }

      // Filter by active status if provided
      if (getSubCategoryQueryDto.is_active !== undefined) {
        filter.is_active = getSubCategoryQueryDto.is_active;
      }

      // Filter by search keyword (name or subcategory_code)
      if (getSubCategoryQueryDto.search) {
        filter.$or = [
          { name: { $regex: getSubCategoryQueryDto.search, $options: 'i' } },
          { subcategory_code: { $regex: getSubCategoryQueryDto.search, $options: 'i' } },
        ];
      }
    }

    // Handle pagination query parameters if passed
    const page = getSubCategoryQueryDto?.page ? Number(getSubCategoryQueryDto.page) : 1;
    const limit = getSubCategoryQueryDto?.limit ? Number(getSubCategoryQueryDto.limit) : 10;
    const skip = (page - 1) * limit;

    return await this.subCategoryModel
      .find(filter)
      .populate('parent_category_id') // Optional: populates parent category details if needed
      .skip(skip)
      .limit(limit)
      .exec();
  }
  //==============================================================================================

  public async findOne(id: string): Promise<SubCategory> {
    const subCategory = await this.subCategoryModel.findById(id).populate('parent_category_id').exec();
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }
  //==============================================================================================

  public async update(id: string, updateSubCategoryDto: UpdateSubCategoryDto): Promise<SubCategory> {
    // If parent_category_id is being updated, ensure it is valid and exists
    if (updateSubCategoryDto.parent_category_id) {
      if (!Types.ObjectId.isValid(updateSubCategoryDto.parent_category_id)) {
        throw new BadRequestException('Invalid parent_category_id format');
      }

      const parentCategory = await this.categoryModel.findById(updateSubCategoryDto.parent_category_id).exec();
      if (!parentCategory) {
        throw new NotFoundException(`Parent category with ID ${updateSubCategoryDto.parent_category_id} not found`);
      }
    }

    try {
      const updatedSubCategory = await this.subCategoryModel.findByIdAndUpdate(id, updateSubCategoryDto, { new: true, runValidators: true }).exec();

      if (!updatedSubCategory) {
        throw new NotFoundException(`SubCategory with ID ${id} not found`);
      }

      return updatedSubCategory;
    } catch (error) {
      if (error === 11000) {
        throw new ConflictException('Subcategory code or name conflict.');
      }
      throw error;
    }
  }
  //==============================================================================================

  public async remove(id: string): Promise<{ message: string }> {
    const result = await this.subCategoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }

    return { message: 'SubCategory successfully deleted' };
  }
  //==============================================================================================
  public async togleStatus(id: string) {
    const updatedSubCategory = await this.subCategoryModel.findByIdAndUpdate(id, { is_active: !true }, { new: true, runValidators: true }).exec();

    if (!updatedSubCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }

    return updatedSubCategory;
  }
  //========================================== Private helper functions ====================================================
}
