import { Module } from '@nestjs/common';
import { ConsoleModule } from 'nestjs-console';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TinkoffModule } from './tinkoff/tinkoff.module';

@Module({
  imports: [ConsoleModule, TinkoffModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
