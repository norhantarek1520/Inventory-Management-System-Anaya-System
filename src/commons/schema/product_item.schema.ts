import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Product } from './product.schema';
import { User } from './user.schema';

export type ProductItemDocument = ProductItem & Document;

// ─── Nested schema: a single attribute entry ────────────────────────────────
// Instead of fixed columns for color / size / weight / etc.,
// we use a free-form key→value object so every product type
// can carry the attributes that actually make sense for it.
// Examples:
//   { key: 'color',    value: 'Midnight Black', unit: null  }
//   { key: 'storage',  value: '256',            unit: 'GB'  }
//   { key: 'weight',   value: '175',            unit: 'g'   }
//   { key: 'material', value: 'Aluminium',       unit: null  }

@Schema({ _id: false })
export class ProductAttribute {
  /** The attribute name, e.g. "color", "size", "weight", "material" */
  @Prop({ required: true, trim: true })
  key: string;

  /** The attribute value as a string, e.g. "Red", "XL", "500" */
  @Prop({ required: true })
  value: string;

  /**
   * Optional unit for numeric values, e.g. "kg", "cm", "GB".
   * Leave null for non-numeric attributes like color or material.
   */
  @Prop({ required: false, default: null })
  unit: string | null;
}

export const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);

// ─── Main schema ─────────────────────────────────────────────────────────────

@Schema({ timestamps: true, collection: 'product_items' })
export class ProductItem {
  // ─── Relationship ──────────────────────────────────────────────────────────

  /**
   * The parent product this item variant belongs to.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Product.name,
    required: true,
    validate: {
      validator: (v: Types.ObjectId | string) => Types.ObjectId.isValid(v as string),
      message: 'product_id must be a valid Product ObjectId',
    },
  })
  product_id: Types.ObjectId;

  // ─── Identification ────────────────────────────────────────────────────────

  /**
   * Unique SKU (Stock Keeping Unit) for this specific variant.
   * Format: SKU-XXXXXXXX (8 alphanumeric chars).
   * Example: SKU-AB12CD34
   */
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      /^SKU-[A-Z0-9]{8}$/,
      'SKU must follow the format SKU-XXXXXXXX (8 uppercase alphanumeric characters)',
    ],
  })
  sku: string;

  // ─── Flexible variant attributes ──────────────────────────────────────────

  /**
   * Dynamic list of key/value attribute pairs that describe what makes
   * this variant unique — color, size, material, storage, etc.
   *
   * This design avoids fixed nullable columns and lets each product type
   * carry only the attributes relevant to it.
   *
   * - At least one attribute is required (a plain item with no variation
   *   should still describe itself, e.g. { key: "variant", value: "Standard" }).
   * - Max 20 attributes per item to keep documents sane.
   */
  @Prop({
    type: [ProductAttributeSchema],
    required: true,
    validate: {
      validator: (attrs: ProductAttribute[]) => Array.isArray(attrs) && attrs.length >= 1,
      message: 'A product item must have at least one attribute.',
    },
  })
  attributes: ProductAttribute[];

  // ─── Metadata (free-form extra data) ─────────────────────────────────────

  /**
   * A freeform JSON object for any extra data that does not fit a
   * structured attribute — e.g. internal notes, supplier codes,
   * custom fields added by integrations.
   *
   * Example: { "supplier_sku": "SUP-9981", "origin": "CN", "warranty_months": 12 }
   */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: Record<string, any>;

  // ─── Pricing ──────────────────────────────────────────────────────────────

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: false, min: 0, default: null })
  compare_at_price: number | null; // Original / crossed-out price for sale display

  // ─── Stock ────────────────────────────────────────────────────────────────

  @Prop({ required: true, min: 0, default: 0 })
  quantity_in_stock: number;

  @Prop({ required: false, min: 0, default: 0 })
  low_stock_threshold: number; // Trigger alerts when stock falls to this level

  // ─── Media ────────────────────────────────────────────────────────────────

  @Prop({ type: [String], default: [] })
  images: string[]; // Variant-specific image URLs (override product images)

  // ─── Audit ────────────────────────────────────────────────────────────────

  /**
   * The user who added this product item to the database.
   */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    validate: {
      validator: (v: Types.ObjectId | string) => Types.ObjectId.isValid(v as string),
      message: 'added_by must be a valid User ObjectId',
    },
  })
  added_by: Types.ObjectId;

  // ─── Status ───────────────────────────────────────────────────────────────

  @Prop({ required: true, default: true })
  is_active: boolean;
}

export const ProductItemSchema = SchemaFactory.createForClass(ProductItem);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Fast lookups for all items of a given product
ProductItemSchema.index({ product_id: 1 });

// SKU must be globally unique
ProductItemSchema.index({ sku: 1 }, { unique: true });

// Quickly find items by the user who added them
ProductItemSchema.index({ added_by: 1 });

// Efficient low-stock queries: product_id + quantity
ProductItemSchema.index({ product_id: 1, quantity_in_stock: 1 });
