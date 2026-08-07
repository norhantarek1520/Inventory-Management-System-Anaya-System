import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/commons/schema/user.schema';
import { SuperAdminSeeder } from './super_admin.seeder';

/**
 * Aggregates all data seeders. Each seeder runs automatically on
 * application bootstrap (see OnApplicationBootstrap in each seeder).
 * Add new seeders here as the system grows.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [SuperAdminSeeder],
})
export class SeedersModule {}
