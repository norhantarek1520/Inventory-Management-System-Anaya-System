import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Schema as MongooseSchema, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^C\d{3}$/, 'Category code must be in the format C001, C002, ...'],
  })
  category_code: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  })
  name: string;

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

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ category_code: 1 }, { unique: true });
CategorySchema.index({ name: 1 }, { unique: true });
