import { Controller, Get } from '@nestjs/common';
import { TinkoffService } from './tinkoff.service';
import * as promClient from 'prom-client';
import axios from 'axios';
import { clog } from '../libs/clog';
import { ConfigService } from '@nestjs/config';

@Controller('metrics')
export class TinkoffController {
  public USD: any;
  public TUSD: any;
  public RUB: any;
  public RUB_CASH_USD: any;
  public RUB_INVESTED: any;
  public RUB_INVESTED_USD: any;
  public RUB_TOTAL_USD: any;
  public BTC: any;
  public BTCUSD: number;
  public totalUSD: any;
  public positions: any[];
  public usdrub: any;
  constructor(
    private readonly tinkoffService: TinkoffService,
    private readonly configService: ConfigService,
  ) {
    this.tinkoffService = tinkoffService;
    this.configService = configService;
  }

  async registryMetrics(registry) {
    const gauge = new promClient.Gauge({
      name: 'balance_iis',
      help: 'Some description here',
      registers: [registry],
      labelNames: ['category', 'account'],
    });
    const gauge2 = new promClient.Gauge({
      name: 'portfolio_iis',
      help: 'Some description here',
      registers: [registry],
      labelNames: ['ticker', 'account'],
    });

    const ETHPLORER_API_KEY = this.configService.get('ETHPLORER_API_KEY');
    const TUSD_ADDRESS = this.configService.get('TUSD_ADDRESS');

    if (
      ETHPLORER_API_KEY &&
      TUSD_ADDRESS &&
      (!this.TUSD || Math.random() > 0.9)
    ) {
      const TUSD_URL = `https://api.ethplorer.io/getAddressInfo/${TUSD_ADDRESS}?apiKey=${ETHPLORER_API_KEY}`;
      console.log(TUSD_URL);
      this.TUSD = await axios
        .get(TUSD_URL)
        .then(
          ({ data }) =>
            data?.tokens.find((token) => token.tokenInfo.symbol == 'USDT')
              .balance / 1000000,
        );
    }

    if (!this.USD || !this.usdrub || Math.random() > 0.9) {
      await this.tinkoffService.update();
      const state = this.tinkoffService.getState();
      this.USD = state.USD;
      this.RUB = state.RUB;
      this.totalUSD = this.USD + this.tinkoffService.getUSDMarket().total;
      this.RUB_INVESTED = this.tinkoffService.getRUBMarket().total;
      this.positions = this.tinkoffService.getUSDMarket().positions;
      this.usdrub = this.tinkoffService
        .getRUBMarket()
        .positions.find((p) => p.ticker == 'USD000UTSTOM').lastPrice;
      this.RUB_INVESTED_USD = this.RUB_INVESTED / this.usdrub;
      this.RUB_CASH_USD = this.RUB / this.usdrub;
      this.RUB_TOTAL_USD = (this.RUB + this.RUB_INVESTED) / this.usdrub;
      console.log(this.RUB_INVESTED_USD, this.RUB_CASH_USD);

      this.tinkoffService
        .getRUBMarket()
        .positions.map(({ ticker, cost }) => ({
          ticker,
          cost: cost / this.usdrub,
        }))
        .forEach((p) => p.ticker !== 'USD000UTSTOM' && this.positions.push(p));
      this.positions.push({
        ticker: 'RUB_CASH_USD',
        cost: this.RUB_CASH_USD,
      });
    }

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

      if (!this.BTCUSD || Math.random() > 11 / 12) {
        const rates = (
          await axios.get('https://api.smartbit.com.au/v1/exchange-rates')
        ).data.exchange_rates;
        this.BTCUSD =
          Math.round(
            10000 * this.BTC * rates.find((rate) => rate.code == 'USD').rate,
          ) / 10000;
      }
      console.log(this.BTCUSD);

      gauge2.set(
        {
          ticker: 'BTC',
          account: this.tinkoffService.account,
        },
        this.BTCUSD,
      );

      gauge.set(
        {
          category: 'BTC',
          account: this.tinkoffService.account,
        },
        this.BTCUSD,
      );
    }

    this.positions.forEach((p) => {
      clog(p.ticker, p.cost);
      const labels = {
        ticker: p.ticker,
        account: this.tinkoffService.account,
      };
      if (p.cost && p.ticker) {
        return gauge2.set(labels, p.cost);
      } else clog(labels, p.cost);
    });

    if (this.TUSD || this.BTCUSD) {
      gauge.set(
        {
          category: 'CRYPTO',
          account: this.tinkoffService.account,
        },
        this.TUSD + this.BTCUSD,
      );
    }

    if (this.TUSD) {
      gauge2.set(
        {
          ticker: 'TUSD',
          account: this.tinkoffService.account,
        },
        this.TUSD,
      );

      gauge.set(
        {
          category: 'TUSD',
          account: this.tinkoffService.account,
        },
        this.TUSD,
      );
    }

    gauge.set(
      {
        category: 'TOTAL USD IIS',
        account: this.tinkoffService.account,
      },
      this.totalUSD,
    );

    gauge.set(
      {
        category: 'TOTAL USD',
        account: this.tinkoffService.account,
      },
      this.totalUSD + this.TUSD,
    );

    gauge.set(
      {
        category: 'TOTAL IIS',
        account: this.tinkoffService.account,
      },
      this.totalUSD + this.RUB_TOTAL_USD,
    );

    gauge.set(
      {
        category: 'TOTAL',
        account: this.tinkoffService.account,
      },
      this.totalUSD + this.BTCUSD + this.RUB_TOTAL_USD + this.TUSD,
    );

    gauge.set(
      {
        category: 'CASH',
        account: this.tinkoffService.account,
      },
      this.USD,
    );
    gauge.set(
      {
        category: 'INVESTED',
        account: this.tinkoffService.account,
      },
      this.totalUSD - this.USD,
    );
    gauge.set(
      {
        category: 'RUB_CASH_USD',
        account: this.tinkoffService.account,
      },
      this.RUB_CASH_USD,
    );
    gauge.set(
      {
        category: 'RUB_INVESTED_USD',
        account: this.tinkoffService.account,
      },
      this.RUB_INVESTED_USD,
    );
    gauge.set(
      {
        category: 'RUB_TOTAL_USD',
        account: this.tinkoffService.account,
      },
      this.RUB_TOTAL_USD,
    );
    gauge2.set(
      { ticker: 'USD', account: this.tinkoffService.account },
      this.USD,
    );
  }

  @Get()
  async getHelloTrader(): Promise<any> {
    clog('Hello!');

    const registry = new promClient.Registry();

    await this.registryMetrics(registry).catch((e) => console.log(e));

    return registry.metrics();
  }
}
