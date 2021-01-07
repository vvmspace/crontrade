import { Module } from '@nestjs/common';
import { ConsoleModule } from 'nestjs-console';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConsoleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
