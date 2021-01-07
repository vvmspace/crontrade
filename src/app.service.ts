import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHelloTrader(): string {
    return 'Hello Trader!';
  }
}
