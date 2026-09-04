import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Schema as MongooseSchema, Types } from 'mongoose';
import { Category } from './category.schema';

export type SubCategoryDocument = SubCategory & Document;

@Schema({ timestamps: true, collection: 'subcategories' })
export class SubCategory {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^SC\d{3}$/, 'Subcategory code must be in the format SC001, SC002, ...'],
  })
  subcategory_code: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Category.name,
    required: true,
    validate: {
      validator: (value: Types.ObjectId | string) => Types.ObjectId.isValid(value as string),
      message: 'parent_category_id must be a valid Category ObjectId',
    },
  })
  parent_category_id: Types.ObjectId;

  @Prop({
    required: false,
    trim: true,
    maxlength: 500,
    default: '',
  })
  description?: string;

  @Prop({ required: true, default: true })
  is_active: boolean;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
SubCategorySchema.index({ subcategory_code: 1 }, { unique: true }); //This ensures that every subcategory code must be unique across the entire collection.
SubCategorySchema.index({ parent_category_id: 1, name: 1 }, { unique: true }); //within the same parent category, subcategory names must be unique.
