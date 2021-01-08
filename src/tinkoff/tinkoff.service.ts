import { Injectable } from '@nestjs/common';
import { Command, Console } from 'nestjs-console';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OpenAPI = require('@tinkoff/invest-openapi-js-sdk');

import { clog } from '../libs/clog';
import { MarketInstrument } from '@tinkoff/invest-openapi-js-sdk/build/domain';
import { weights, weightsWithPercent } from './defaults';
import { IPosition, IState } from './tinkoff.interfaces';

const apiURL = 'https://api-invest.tinkoff.ru/openapi';
const sandboxApiURL = 'https://api-invest.tinkoff.ru/openapi/sandbox/';
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
const secretToken = process.env.TOKEN; // токен для боевого api
const sandboxToken = process.env.SANDBOX_TOKEN; // токен для сандбокса

const api = new OpenAPI({
  apiURL: (process.env.TOKEN && apiURL) || sandboxApiURL,
  secretToken: ((process.env.TOKEN && secretToken) || sandboxToken) as string,
  socketURL,
});

const sleep = async (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time));

@Injectable()
@Console()
export class TinkoffService {
  state: IState;
  configService: ConfigService;
  api: any;

  constructor(configService: ConfigService) {
    this.configService = configService;
    clog(this.configService.get('SANDBOX_TOKEN'));
    this.api = new OpenAPI({
      apiURL:
        (this.configService.get('TOKEN', null) && apiURL) || sandboxApiURL,
      secretToken: this.configService.get(
        'TOKEN',
        this.configService.get('SANDBOX_TOKEN'),
      ) as string,
      socketURL,
    });
  }

  @Command({
    command: 'tinkoff:hello',
  })
  helloTinkoff() {
    clog('Hello Tinkoff');
  }

  @Command({
    command: 'tinkoff:update',
  })
  async update() {
    clog('updating');

    if (process.env.BROKER_ACCOUNT_ID) {
      await this.api.setCurrentAccountId(process.env.BROKER_ACCOUNT_ID);
    }

    const { currencies } = await this.api.portfolioCurrencies();
    const portfolio = await this.api.portfolio();
    const positions = await this.preprocessPositions(portfolio.positions);
    console.log(positions);
    const USDP: IPosition[] = positions.filter(
      (p: IPosition) => p.currency == 'USD',
    );
    const RUBP: IPosition[] = positions.filter(
      (p: IPosition) => p.currency == 'RUB',
    );
    console.log(USDP, RUBP);
    this.state = {
      markets: [
        {
          currency: 'USD',
          positions: USDP,
          total:
            (USDP.length > 0 &&
              USDP.map((u) => u.cost).reduce((a, b) => a + b)) ||
            0,
        },
        {
          currency: 'RUB',
          positions: RUBP,
          total:
            (RUBP.length > 0 &&
              RUBP.map((u) => u.cost).reduce((a, b) => a + b)) ||
            0,
        },
      ],
      currencies,
    };
    this.state.USD = this.getUSDs();

    this.state.markets = this.state.markets.map((m) => {
      return {
        ...m,
        positions: m.positions.map((p) => {
          const total = m.total + this.getCurrencyBalance(m.currency);
          const percent = (100 * p.cost) / total;
          return {
            ...p,
            percent,
            total,
          };
        }),
      };
    });
  }

  async preprocessPositions(positions): Promise<IPosition[]> {
    return await Promise.all(
      positions.map(
        async (position): Promise<IPosition> => {
          const figi = position.figi || (await this.getFigi(position.ticker));
          const info = await this.api.orderbookGet({
            figi,
            depth: 1,
          });
          clog(position.balance);
          const instrument = await this.api.searchOne({ figi });
          return {
            ...position,
            cost:
              position.cost ||
              (position.balance && info.lastPrice * position.balance) ||
              0,
            lastPrice: info.lastPrice,
            currency: instrument.currency,
          };
        },
      ),
    );
  }

  @Command({
    command: 'tinkoff:sandbox:set <currency> <balance>',
  })
  async sandboxSet(currency, balance) {
    clog(currency, balance);
    clog(
      await this.api.setCurrenciesBalance({
        currency,
        balance: parseInt(balance),
      }),
    );
    // console.log(await this.api.limitOrder({ operation: 'Buy', figi, lots: 1, price: 100 }));
  }

  @Command({
    command: 'tinkoff:sandbox:reset',
  })
  async sandboxReset() {
    await this.api.sandboxClear();
    return this.sandboxSet('USD', 200);
  }

  @Command({
    command: 'tinkoff:buy <ticker> <lots>',
  })
  async buy(ticker, lots) {
    await this.update();
    console.log(this.getRUBMarket().positions);
    const figi = await this.getFigi(ticker);
    const order = { figi, operation: 'Buy', lots: parseInt(lots) };
    console.log(order);
    console.log(await this.api.marketOrder(order));
  }

  async getFigi(ticker: string) {
    if (ticker == 'USD') {
      return 'BBG0013HGFT4';
    }
    if (ticker == 'EUR') {
      return 'BBG0013HJJ31';
    }
    const marketInstrument = (await this.api.searchOne({
      ticker,
    })) as MarketInstrument;
    const { figi } = marketInstrument;
    return figi;
  }
  @Command({
    command: 'tinkoff:buy:some',
  })
  async buySome() {
    await this.update();
    const weightsWithCurrentPercent = weightsWithPercent.map((w) => {
      const item = this.getUSDMarket().positions.find(
        (position) => position.ticker == w.ticker,
      );
      return { ...w, cost: item?.cost, currentPercent: item?.percent || 0 };
    });

    const preprocessed = await this.preprocessPositions(
      weightsWithCurrentPercent,
    );

    const underWeight = preprocessed.filter(
      (w) =>
        !w.manual &&
        w.lastPrice < this.getUSDs() &&
        w.currentPercent < w.percent,
    );

    clog(
      { weightsWithCurrentPercent, preprocessed, underWeight },
      underWeight.length,
    );

    const WTB = underWeight[Math.floor(Math.random() * underWeight.length)];
    clog({ WTB });
    const figi = WTB.figi || (await this.getFigi(WTB.ticker));
    const order = { figi, operation: 'Buy', lots: WTB.lots || 1 };
    console.log(order);
    clog(await api.marketOrder(order));
  }

  getUSDMarket() {
    return this.state.markets.find((market) => market.currency == 'USD');
  }
  getRUBMarket() {
    return this.state.markets.find((market) => market.currency == 'RUB');
  }
  getUSDs() {
    return this.getCurrencyBalance('USD');
  }
  getCurrencyBalance(currency) {
    return this.state.currencies.find((c) => c.currency == currency).balance;
  }
}
