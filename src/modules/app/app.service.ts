import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello Nourhan ! welcomeback to NestJS(21/2/2026).';
  }
}
