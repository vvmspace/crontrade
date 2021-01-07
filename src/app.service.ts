import { Injectable } from '@nestjs/common';
import { Console, Command } from 'nestjs-console';

@Injectable()
@Console()
export class AppService {
  @Command({
    command: 'hello',
    description: 'returns "Hello Trader!"',
  })
  getHelloTrader(): string {
    const helloTrader = 'Hello Trader!';
    process.env.CONSOLE && console.log(helloTrader);
    return helloTrader;
  }
}
