import { IPosition } from './tinkoff.interfaces';
// import { clog } from '../libs/clog';

export const weights = [
  // {
  //   ticker: 'TGLD',
  //   figi: 'BBG222222222',
  //   weight: 4,
  //   lots: 3,
  //   manual: true,
  // },
  // {
  //   ticker: 'TIPO',
  //   figi: 'TCS00A102EM7',
  //   weight: 2,
  //   lots: 3,
  //   manual: true,
  // },
  // {
  //   ticker: 'TECH',
  //   figi: 'BBG111111111',
  //   weight: 1,
  //   lots: 3,
  //   manual: true,
  // },
  // {
  //   ticker: 'TBIO',
  //   figi: 'TCS00A102EK1',
  //   weight: 1,
  //   lots: 3,
  //   manual: true,
  // },
  {
    ticker: 'VEON',
    figi: 'BBG000QCW561',
    weight: 1,
  },
  {
    ticker: 'ZYNE',
    figi: 'BBG007BBS8B7',
    weight: 1,
  },
  {
    ticker: 'MBT',
    figi: 'BBG000CSZKR2',
    weight: 6,
  },
  {
    ticker: 'AIV',
    weight: 1,
  },
  {
    ticker: 'ARCC',
    weight: 1,
  },
  {
    ticker: 'LUMN',
    weight: 1,
  },
  {
    ticker: 'GNL',
    weight: 1,
  },
  {
    ticker: 'OKE',
    weight: 1,
  },
  {
    ticker: 'PFE',
    weight: 1,
  },
  {
    ticker: 'CNK',
    weight: 1,
  },
  {
    ticker: 'MOMO',
    weight: 1,
  },
  {
    ticker: 'FXIM',
    weight: 4,
  },
  {
    ticker: 'VZ',
    weight: 4,
  },
  {
    ticker: 'PFE',
    weight: 4,
  },
  {
    ticker: 'T',
    weight: 4,
  },
  {
    ticker: 'KO',
    weight: 4,
  },
  {
    ticker: 'ED',
    weight: 4,
  },
];

const ru = ['GLTR', 'RTKM'];

const totalWeight = weights.map((w) => w.weight).reduce((a, b) => a + b);

export const weightsWithPercent = weights.map((weight) => {
  return { ...weight, percent: (100 * weight.weight) / totalWeight };
});

// clog(weightsWithPercent);

export const isUnderWeight = ({ figi, ticker, percent }: IPosition) => {
  const item = weights.find((w) => w.figi == figi || w.ticker == ticker);
  if (!item) {
    return;
  }
  return (100 * item.weight) / totalWeight > percent;
};
