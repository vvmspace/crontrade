import { Injectable } from '@nestjs/common';
import { Console, Command } from 'nestjs-console';
import { clog } from './libs/clog';

@Injectable()
@Console()
export class AppService {
  @Command({
    command: 'hello',
    description: 'returns "Hello Trader!"',
  })
  getHelloTrader(): string {
    const helloTrader = 'Hello Trader!';
    clog(helloTrader);
    return helloTrader;
  }
}
