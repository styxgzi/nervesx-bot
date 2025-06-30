import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthCheckController {
  @Get('/')
  get(): string {
    return 'OK';
  }
  @Get('/health_check')
  getHealthCheck(): string {
    return 'OK';
  }
}
