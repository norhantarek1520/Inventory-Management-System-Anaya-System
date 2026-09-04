import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from 'src/commons/schema';
import { SubCategory, SubCategoryDocument } from 'src/commons/schema';
import { CreateProductDto, UpdateProductDto, GetProductQueryDto } from 'src/commons';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(SubCategory.name) private readonly subCategoryModel: Model<SubCategoryDocument>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Creates a new product.
   * @param createProductDto  – validated request body
   * @param userId            – ObjectId string from the authenticated JWT payload
   */
  public async create(createProductDto: CreateProductDto, userId: string): Promise<Product> {
    // 1. Validate primary sub-category exists and is active
    await this.validateSubCategory(createProductDto.primary_subcategory_id, 'primary_subcategory_id');

    // 2. Validate secondary sub-category (if provided)
    if (createProductDto.secondary_subcategory_id) {
      if (createProductDto.secondary_subcategory_id === createProductDto.primary_subcategory_id) {
        throw new BadRequestException('secondary_subcategory_id must be different from primary_subcategory_id');
      }
      await this.validateSubCategory(createProductDto.secondary_subcategory_id, 'secondary_subcategory_id');
    }

    try {
      const product = new this.productModel({
        ...createProductDto,
        added_by: new Types.ObjectId(userId),
      });

      return await product.save();
    } catch (error) {
      throw new ConflictException(`A product with code "${createProductDto.product_code}" already exists.`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  READ ALL  (with filters + pagination)
  // ═══════════════════════════════════════════════════════════════════════════

  public async findAll(query?: GetProductQueryDto): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const filter: Record<string, any> = {};

    if (query) {
      if (query.primary_subcategory_id) {
        if (!Types.ObjectId.isValid(query.primary_subcategory_id)) {
          throw new BadRequestException('Invalid primary_subcategory_id format');
        }
        filter.primary_subcategory_id = new Types.ObjectId(query.primary_subcategory_id);
      }

      if (query.secondary_subcategory_id) {
        if (!Types.ObjectId.isValid(query.secondary_subcategory_id)) {
          throw new BadRequestException('Invalid secondary_subcategory_id format');
        }
        filter.secondary_subcategory_id = new Types.ObjectId(query.secondary_subcategory_id);
      }

      if (query.added_by) {
        if (!Types.ObjectId.isValid(query.added_by)) {
          throw new BadRequestException('Invalid added_by format');
        }
        filter.added_by = new Types.ObjectId(query.added_by);
      }

      if (query.is_active !== undefined) {
        filter.is_active = query.is_active;
      }

      if (query.search) {
        filter.$or = [{ name: { $regex: query.search, $options: 'i' } }, { product_code: { $regex: query.search, $options: 'i' } }];
      }
    }

    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('primary_subcategory_id')
        .populate('secondary_subcategory_id')
        .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  READ ONE
  // ═══════════════════════════════════════════════════════════════════════════

  public async findOne(id: string): Promise<Product> {
    this.assertValidObjectId(id, 'Product id');

    const product = await this.productModel
      .findById(id)
      .populate('primary_subcategory_id')
      .populate('secondary_subcategory_id')
      .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  public async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    this.assertValidObjectId(id, 'Product id');

    // Validate sub-categories if they are being updated
    if (updateProductDto.primary_subcategory_id) {
      await this.validateSubCategory(updateProductDto.primary_subcategory_id, 'primary_subcategory_id');
    }

    if (updateProductDto.secondary_subcategory_id) {
      // Guard against making both sub-categories the same during an update
      const primaryId =
        updateProductDto.primary_subcategory_id ??
        (await this.productModel.findById(id).select('primary_subcategory_id').lean().exec())?.primary_subcategory_id?.toString();

      if (updateProductDto.secondary_subcategory_id === primaryId) {
        throw new BadRequestException('secondary_subcategory_id must be different from primary_subcategory_id');
      }

      await this.validateSubCategory(updateProductDto.secondary_subcategory_id, 'secondary_subcategory_id');
    }

    try {
      const updated = await this.productModel
        .findByIdAndUpdate(id, updateProductDto, { new: true, runValidators: true })
        .populate('primary_subcategory_id')
        .populate('secondary_subcategory_id')
        .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
        .exec();

      if (!updated) {
        throw new NotFoundException(`Product with ID "${id}" not found`);
      }

      return updated;
    } catch (error) {
      throw new ConflictException('Product code already in use by another product.');

      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  public async remove(id: string): Promise<{ message: string }> {
    this.assertValidObjectId(id, 'Product id');

    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return { message: `Product "${result.name}" (${result.product_code}) has been permanently deleted.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOGGLE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  public async toggleStatus(id: string): Promise<Product> {
    this.assertValidObjectId(id, 'Product id');

    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    product.is_active = !product.is_active;
    return await product.save();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private assertValidObjectId(value: string, fieldName: string): void {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${fieldName} is not a valid MongoDB ObjectId`);
    }
  }

  /**
   * Checks that a sub-category exists AND is active.
   * Throws NotFoundException / ForbiddenException accordingly.
   */
  private async validateSubCategory(subcategoryId: string, fieldName: string): Promise<void> {
    this.assertValidObjectId(subcategoryId, fieldName);

    const subCategory = await this.subCategoryModel.findById(subcategoryId).exec();
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID "${subcategoryId}" (${fieldName}) not found`);
    }
    if (!subCategory.is_active) {
      throw new ForbiddenException(`SubCategory "${subCategory.name}" is currently inactive and cannot be assigned to a product`);
    }
  }
}
