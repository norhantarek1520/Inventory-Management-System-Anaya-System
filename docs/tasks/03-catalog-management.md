# Catalog Management Modules Specification

## 1. What are all the 4 modules

The catalog management domain of the Inventory Management System (IMS) consists of four core NestJS modules:

1. **Category Module (`src/modules/category`)**
2. **SubCategory Module (`src/modules/sub_category`)**
3. **Product Module (`src/modules/product`)**
4. **ProductItem Module (`src/modules/product_item`)**

---

## 2. How they interact with each other ?

1.  **Category to SubCategory**: A Category must exist first. A SubCategory references its parent category ID (parent_category_id). You cannot create a sub-category without linking it to an active parent category

2.  **Category/SubCategory to Product**: When creating a Product, the system requires a parent category_id and one or more related sub_category_ids. A backend validation guard ensures that selected sub-categories genuinely belong to that specific parent category.

3.  **Product to ProductItem**: A single Product acts as the parent container for multiple ProductItems (variants). For example, one Product (Notebook) will have many ProductItems (A4 Red Notebook, A5 Blue Notebook, Small Yellow Notebook), each with distinct barcodes and stock levels.

## 3. What tasks on each module

### Module 1: Category (`src/modules/category`)

- [ ] Create Category Mongoose Schema with fields: `category_code` (auto-generated pattern like `C001`), `name`, `description`, and `is_active`.
- [ ] Define `CreateCategoryDto`, `UpdateCategoryDto`, and query DTOs using `class-validator`.
- [ ] Implement sequential code generation logic in `CategoryService` (`C` + 3 zero-padded digits starting from `C001`).
- [ ] Add unique duplicate checks for category name and code.
- [ ] Implement CRUD endpoints in `CategoryController` protected with permission guards (`POST`, `GET`, `PATCH`, `DELETE`).
- [ ] Integrate Swagger decorations (`@ApiOperation`, `@ApiResponse`).

### Module 2: SubCategory (`src/modules/sub_category`)

- [ ] Create SubCategory Mongoose Schema with fields: `subcategory_code` (pattern like `SC001`), `name`, `parent_category_id` (MongoDB reference), `description`, and `is_active`.
- [ ] Define `CreateSubCategoryDto`, `UpdateSubCategoryDto`, and query DTOs with validation rules for parent category IDs.
- [ ] Implement parent validation logic in `SubCategoryService` to verify that the referenced category exists and is active.
- [ ] Implement sequential code generator logic for sub-categories (`SC001`, `SC002`, etc.).
- [ ] Add deletion safeguard logic to prevent removing a parent Category if active SubCategories are still linked to it.
- [ ] Build CRUD controller endpoints protected by permission guards.

### Module 3: Product (`src/modules/product`)

- [ ] Create Product Mongoose Schema for parent merchandise records (fields: `title`, `brand`, `description`, `category_id` reference, `sub_category_ids` array references, `is_active`).
- [ ] Define `CreateProductDto`, `UpdateProductDto`, and query DTOs.
- [ ] Implement category/sub-category alignment check in `ProductService` to validate that selected sub-categories belong to the specified parent category.
- [ ] Implement Mongoose population queries to return populated category and sub-category details.
- [ ] Build REST controller endpoints with appropriate permission decorators.
- [ ] Add query filters and search pipelines for filtering products by title, brand, category, or sub-category.

### Module 4: ProductItem (`src/modules/product_item`)

- [ ] Create ProductItem Mongoose Schema for physical variants/SKUs (fields: `product_id` reference, unique `sku`, unique `barcode`, `attributes` object, `cost_price`, `selling_price`, `stock_quantity`, `reorder_point`, `is_active`).
- [ ] Define DTOs for creation, updates, querying, and stock adjustments (`CreateProductItemDto`, `UpdateProductItemDto`, `AdjustStockDto`).
- [ ] Build helper utilities to generate unique SKU patterns (e.g., `NB-A4-RED`) and barcodes.
- [ ] Create a dedicated high-speed barcode lookup endpoint (`GET /product-item/barcode/:barcode`) optimized for POS terminal scanning.
- [ ] Implement atomic `$inc` stock update methods in `ProductItemService` for real-time POS checkout stock deductions and physical stock counts.
- [ ] Secure stock deduction routes to allow machine-to-machine API access for the `system_service` role.
