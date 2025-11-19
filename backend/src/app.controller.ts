import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'ASQ3 Backend API';
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}

