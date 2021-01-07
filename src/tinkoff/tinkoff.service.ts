import { Injectable } from '@nestjs/common';
import { Command, Console } from 'nestjs-console';

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

@Injectable()
@Console()
export class TinkoffService {
  state: IState;

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
    // const portfolioCurrencies = await api.portfolioCurrencies();
    // console.log(portfolioCurrencies);
    const portfolio = await api.portfolio();
    const positions = await this.preprocessPositions(portfolio.positions);
    // console.log(positions);
    const USDP: IPosition[] = positions.filter(
      (p: IPosition) => p.currency == 'USD',
    );
    const RUBP: IPosition[] = positions.filter(
      (p: IPosition) => p.currency == 'RUB',
    );
    // console.log(USDP, RUBP);
    this.state = {
      markets: [
        {
          currency: 'USD',
          positions: USDP,
          total: USDP.map((u) => u.cost).reduce((a, b) => a + b),
        },
        {
          currency: 'RUB',
          positions: RUBP,
          total: RUBP.map((u) => u.cost).reduce((a, b) => a + b),
        },
      ],
    };

    this.state.markets = this.state.markets.map((m) => {
      return {
        ...m,
        positions: m.positions.map((p) => {
          const percent = (100 * p.cost) / m.total;
          // clog({ percent });
          return {
            ...p,
            percent,
          };
        }),
      };
    });

    // clog(this.state.markets[0].positions.filter((p) => isUnderWeight(p)));

    // const currencies = await api.currencies();
    // console.log(currencies);
  }

  async preprocessPositions(positions): Promise<IPosition[]> {
    return await Promise.all(
      positions.map(
        async (position): Promise<IPosition> => {
          const info = await api.orderbookGet({
            figi: position.figi,
            depth: 1,
          });
          const instrument = await api.searchOne({ figi: position.figi });
          return {
            ...position,
            cost: info.lastPrice * position.balance,
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
      await api.setCurrenciesBalance({ currency, balance: parseInt(balance) }),
    );
    // console.log(await api.limitOrder({ operation: 'Buy', figi, lots: 1, price: 100 }));
  }

  @Command({
    command: 'tinkoff:buy <ticker> <lots>',
  })
  async buy(ticker, lots) {
    const figi = await this.getFigi(ticker);
    console.log(
      await api.marketOrder({ figi, operation: 'Buy', lots: parseInt(lots) }),
    );
  }

  async getFigi(ticker: string) {
    if (ticker == 'USD') {
      return 'BBG0013HGFT4';
    }
    if (ticker == 'EUR') {
      return 'BBG0013HJJ31';
    }
    const marketInstrument = (await api.searchOne({
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
    await Promise.all(
      weights.map(async (weight) => {
        !weight.figi &&
          clog({ figi: await this.getFigi(weight.ticker), ...weight });
      }),
    );
    const underWeight = weightsWithPercent
      .map((w) => {
        const item = this.getUSDMarket().positions.find(
          (position) => position.ticker == w.ticker,
        );
        return { ...w, currentPercent: item?.percent || 0 };
      })
      .filter((w) => w.currentPercent < w.percent);

    clog({ underWeight });

    const WTB = underWeight[Math.floor(Math.random() * underWeight.length)];
    clog({ WTB });
    clog(await api.marketOrder({ figi: WTB.figi, operation: 'Buy', lots: 1 }));
  }

  getUSDMarket() {
    return this.state.markets.find((market) => market.currency == 'USD');
  }
}
