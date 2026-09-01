import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { SubCategory } from './subcategory.schema';
import { User } from './user.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  // ─── Identification ────────────────────────────────────────────────────────

  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^P\d{4}$/, 'Product code must be in the format P0001, P0002, ...'],
  })
  product_code: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 150,
  })
  name: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 1000,
    default: '',
  })
  description?: string;

  // ─── Classification ────────────────────────────────────────────────────────

  /**
   * Primary sub-category this product belongs to.
   * Every product MUST belong to at least one sub-category.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SubCategory.name,
    required: true,
    validate: {
      validator: (value: Types.ObjectId | string) => Types.ObjectId.isValid(value as string),
      message: 'primary_subcategory_id must be a valid SubCategory ObjectId',
    },
  })
  primary_subcategory_id: Types.ObjectId;

  /**
   * Secondary (optional) sub-category for cross-listing.
   * Must differ from primary_subcategory_id when provided.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SubCategory.name,
    required: false,
    default: null,
    validate: {
      validator: (value: Types.ObjectId | string | null) =>
        value === null || Types.ObjectId.isValid(value as string),
      message: 'secondary_subcategory_id must be a valid SubCategory ObjectId or null',
    },
  })
  secondary_subcategory_id?: Types.ObjectId | null;

  // ─── Audit ─────────────────────────────────────────────────────────────────

  /**
   * The user who first added this product to the database.
   * Populated from the authenticated user's JWT payload.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    validate: {
      validator: (value: Types.ObjectId | string) => Types.ObjectId.isValid(value as string),
      message: 'added_by must be a valid User ObjectId',
    },
  })
  added_by: Types.ObjectId;

  // ─── Media ─────────────────────────────────────────────────────────────────

  @Prop({ type: [String], default: [] })
  images: string[]; // Array of image URLs / storage keys

  // ─── Status ────────────────────────────────────────────────────────────────

  @Prop({ required: true, default: true })
  is_active: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Ensure unique product code
ProductSchema.index({ product_code: 1 }, { unique: true });

// Optimize lookups by subcategory and by the user who added the product
ProductSchema.index({ primary_subcategory_id: 1 });
ProductSchema.index({ added_by: 1 });
