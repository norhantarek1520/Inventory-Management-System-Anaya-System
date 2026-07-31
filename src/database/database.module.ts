import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        // Additional production-ready options can be passed here
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
