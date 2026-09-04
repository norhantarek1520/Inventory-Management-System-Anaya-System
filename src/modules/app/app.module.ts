import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard, JwtAuthGuard, PermissionsGuard } from 'src/commons';
import { AuthModule } from '../auth/auth.module';
import { SeedersModule } from '../../database/seeders/seeders.module';
import { CategoryModule } from '../category/category.module';
import { SubCategoryModule } from '../sub_category/sub_category.module';
import { ProductModule } from '../product/product.module';
import { ProductItemModule } from '../product_item/product_item.module';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    SeedersModule, //it initializes on every boot.
    CategoryModule,
    SubCategoryModule,
    ProductModule,
    ProductItemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard chain — runs in this order for every route, all must pass:
    // 1. JwtAuthGuard: verifies the token, populates `request.user` (skipped by @Public()).
    // 2. RolesGuard: hard role gate for endpoints locked with @Roles() (super_admin bypasses).
    // 3. PermissionsGuard: fine-grained check against @Permissions() (super_admin bypasses).
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
