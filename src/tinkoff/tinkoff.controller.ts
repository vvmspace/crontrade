import { Controller, Get } from '@nestjs/common';
import { TinkoffService } from './tinkoff.service';
import * as promClient from 'prom-client';
import axios from 'axios';
import { clog } from '../libs/clog';
import { ConfigService } from '@nestjs/config';

@Controller('metrics')
export class TinkoffController {
  public USD: any;
  public RUB: any;
  public BTC: any;
  public BTCUSD: number;
  public totalUSD: any;
  public positions: any[];

  constructor(
    private readonly tinkoffService: TinkoffService,
    private readonly configService: ConfigService,
  ) {
    this.tinkoffService = tinkoffService;
    this.configService = configService;
  }

  @Get()
  async getHelloTrader(): Promise<any> {
    clog('Hello!');

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

    const BTC_ADDRESS = this.configService.get('BTC_ADDRESS', null);

    if (BTC_ADDRESS) {
      if (!this.BTC || Math.random() > 0.95) {
        const BTCData = (
          await axios.get(
            `https://api.smartbit.com.au/v1/blockchain/address/${BTC_ADDRESS}`,
          )
        ).data;
        // clog(BTCData);
        this.BTC = parseFloat(BTCData.address.total.balance);
      }

      if (!this.BTCUSD && Math.random() > 11 / 12) {
        const rates = (
          await axios.get('https://api.smartbit.com.au/v1/exchange-rates')
        ).data.exchange_rates;
        this.BTCUSD = this.BTC * rates.find((rate) => rate.code == 'USD').rate;
      }
      console.log(this.BTCUSD);

      gauge2.set(
        {
          ticker: 'BTC',
        },
        this.BTCUSD,
      );

      gauge.set(
        {
          category: 'BTC',
        },
        this.BTCUSD,
      );
    }

    if (!this.USD || Math.random() > 0.9) {
      await this.tinkoffService.update();
      const state = this.tinkoffService.getState();
      this.USD = state.USD;
      this.totalUSD = this.USD + this.tinkoffService.getUSDMarket().total;
      this.RUB = this.tinkoffService.getRUBMarket().total;
      this.positions = this.tinkoffService.getUSDMarket().positions;
    }

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
