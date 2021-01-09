import { Controller, Get } from '@nestjs/common';
import { TinkoffService } from './tinkoff.service';
import * as promClient from 'prom-client';

@Controller('metrics')
export class TinkoffController {
  public USD: any;
  public RUB: any;
  public totalUSD: any;
  public positions: any[];

  constructor(private readonly tinkoffService: TinkoffService) {
    this.tinkoffService = tinkoffService;
  }

  @Get()
  async getHelloTrader(): Promise<any> {
    if (!this.USD || Math.random() > 0.9) {
      await this.tinkoffService.update();
      const state = this.tinkoffService.getState();
      this.USD = state.USD;
      this.totalUSD = this.USD + this.tinkoffService.getUSDMarket().total;
      this.RUB = this.tinkoffService.getRUBMarket().total;
      this.positions = this.tinkoffService.getUSDMarket().positions;
    }

    const registry = new promClient.Registry();
    const gauge = new promClient.Gauge({
      name: 'balance_iis',
      help: 'Some description here',
      registers: [registry],
      labelNames: ['category'],
    });
    const gauge2 = new promClient.Gauge({
      name: 'portfolio_iis',
      help: 'Some description here',
      registers: [registry],
      labelNames: ['ticker'],
    });

    this.positions.forEach((p) =>
      gauge2.set(
        {
          ticker: p.ticker,
        },
        p.cost,
      ),
    );
    gauge.set(
      {
        category: 'TOTAL',
      },
      this.totalUSD,
    );
    gauge.set(
      {
        category: 'CASH',
      },
      this.USD,
    );
    gauge.set(
      {
        category: 'INVESTED',
      },
      this.totalUSD - this.USD,
    );
    gauge2.set({ ticker: 'USD' }, this.USD);

    return registry.metrics();
  }
}
