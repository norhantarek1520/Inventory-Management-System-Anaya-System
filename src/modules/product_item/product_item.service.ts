import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductItem, ProductItemDocument } from 'src/commons/schema';
import { Product, ProductDocument } from 'src/commons/schema';
import {
  CreateProductItemDto,
  UpdateProductItemDto,
  GetProductItemQueryDto,
} from 'src/commons';

@Injectable()
export class ProductItemService {
  constructor(
    @InjectModel(ProductItem.name) private readonly productItemModel: Model<ProductItemDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Creates a new product item (variant).
   * @param dto    – validated request body
   * @param userId – authenticated user's ObjectId string (from JWT via @CurrentUser)
   */
  public async create(dto: CreateProductItemDto, userId: string): Promise<ProductItem> {
    // 1. Verify the parent product exists and is active
    await this.validateProduct(dto.product_id);

    try {
      const item = new this.productItemModel({
        ...dto,
        added_by: new Types.ObjectId(userId),
      });
      return await item.save();
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictException(`A product item with SKU "${dto.sku}" already exists.`);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  READ ALL  (with filters + pagination)
  // ═══════════════════════════════════════════════════════════════════════════

  public async findAll(query?: GetProductItemQueryDto): Promise<{
    data: ProductItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: Record<string, any> = {};

    if (query) {
      if (query.product_id) {
        this.assertValidObjectId(query.product_id, 'product_id');
        filter.product_id = new Types.ObjectId(query.product_id);
      }

      if (query.added_by) {
        this.assertValidObjectId(query.added_by, 'added_by');
        filter.added_by = new Types.ObjectId(query.added_by);
      }

      if (query.is_active !== undefined) {
        filter.is_active = query.is_active;
      }

      if (query.search) {
        filter.sku = { $regex: query.search, $options: 'i' };
      }

      // Only items where quantity ≤ low_stock_threshold
      if (query.low_stock_only) {
        filter.$expr = { $lte: ['$quantity_in_stock', '$low_stock_threshold'] };
      }
    }

    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.productItemModel
        .find(filter)
        .populate('product_id', 'product_code name primary_subcategory_id secondary_subcategory_id')
        .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productItemModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  READ ALL items for a specific product  (convenience shortcut)
  // ═══════════════════════════════════════════════════════════════════════════

  public async findByProduct(productId: string): Promise<ProductItem[]> {
    this.assertValidObjectId(productId, 'productId');
    await this.validateProduct(productId);

    return this.productItemModel
      .find({ product_id: new Types.ObjectId(productId) })
      .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
      .exec();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  READ ONE
  // ═══════════════════════════════════════════════════════════════════════════

  public async findOne(id: string): Promise<ProductItem> {
    this.assertValidObjectId(id, 'ProductItem id');

    const item = await this.productItemModel
      .findById(id)
      .populate('product_id', 'product_code name primary_subcategory_id secondary_subcategory_id')
      .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
      .exec();

    if (!item) {
      throw new NotFoundException(`ProductItem with ID "${id}" not found`);
    }

    return item;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  public async update(id: string, dto: UpdateProductItemDto): Promise<ProductItem> {
    this.assertValidObjectId(id, 'ProductItem id');

    try {
      const updated = await this.productItemModel
        .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
        .populate('product_id', 'product_code name')
        .populate('added_by', '-password -refreshTokenHash -twoFactorSecret -passwordResetCode -passwordResetCodeExpiry')
        .exec();

      if (!updated) {
        throw new NotFoundException(`ProductItem with ID "${id}" not found`);
      }

      return updated;
    } catch (error) {
      if (error?.code === 11000) {
        throw new ConflictException('SKU already in use by another product item.');
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TOGGLE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  public async toggleStatus(id: string): Promise<ProductItem> {
    this.assertValidObjectId(id, 'ProductItem id');

    const item = await this.productItemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`ProductItem with ID "${id}" not found`);
    }

    item.is_active = !item.is_active;
    return await item.save();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  public async remove(id: string): Promise<{ message: string }> {
    this.assertValidObjectId(id, 'ProductItem id');

    const result = await this.productItemModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`ProductItem with ID "${id}" not found`);
    }

    return { message: `Product item with SKU "${result.sku}" has been permanently deleted.` };
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
   * Ensures the referenced parent product exists and is active.
   */
  private async validateProduct(productId: string): Promise<void> {
    this.assertValidObjectId(productId, 'product_id');

    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException(`Parent product with ID "${productId}" not found`);
    }
    if (!product.is_active) {
      throw new BadRequestException(
        `Parent product "${product.name}" is currently inactive. ` +
          `Activate it before adding variants.`,
      );
    }
  }
}
