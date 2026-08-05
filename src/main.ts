import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { ValidationPipe } from 'node_modules/@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //============================== Global Validation Pipe ==========================================
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // ✅ Required to transform query string values into class instances/types
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // ============================== Swagger Configuration ==========================================
  const config = new DocumentBuilder()
    .setTitle('Inventory Management System - Anaya Market API')
    .setDescription('Product Management & System API documentation')
    .setVersion('1.0')
    // .addBearerAuth() // Enables JWT token auth support in UI
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);
  //============================== Run the server ==========================================
  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server is running on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(
    `📚 Swagger documentation available at http://localhost:${process.env.PORT ?? 3000}/doc`,
  );
}
bootstrap();
