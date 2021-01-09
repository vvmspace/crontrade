import { Module } from '@nestjs/common';
import { TinkoffService } from './tinkoff.service';
import { ConfigModule } from '@nestjs/config';
import { TinkoffController } from './tinkoff.controller';

@Module({
  providers: [TinkoffService],
  controllers: [TinkoffController],
  imports: [
    ConfigModule.forRoot({
      validationOptions: {
        allowUnknown: false,
      },
    }),
  ],
})
export class TinkoffModule {}
