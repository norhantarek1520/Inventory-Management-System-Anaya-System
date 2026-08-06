import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'src/commons';
import { AuthModule } from '../auth/auth.module';
import { SeedersModule } from '../../database/seeders/seeders.module';

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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD, // Register the RolesGuard globally
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
