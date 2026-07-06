import { Injectable } from '@nestjs/common';
import { createSuccessResponse } from './common/type/response';

@Injectable()
export class AppService {
  getHello() {
    return createSuccessResponse('Boilerplate NestJS React API is running', {
      message: 'Hello World',
    });
  }
}
