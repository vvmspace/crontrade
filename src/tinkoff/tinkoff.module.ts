import { Module } from '@nestjs/common';
import { TinkoffService } from './tinkoff.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [TinkoffService],
  imports: [
    ConfigModule.forRoot({
      validationOptions: {
        allowUnknown: false,
      },
    }),
  ],
})
export class TinkoffModule {}
