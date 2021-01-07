import { IPosition } from './tinkoff.service';

const weights = [
  {
    ticker: 'TIPO',
    figi: 'TCS00A102EM7',
    weight: 30,
  },
  {
    ticker: 'VEON',
    figi: 'BBG000QCW561',
    weight: 10,
  },
  {
    figi: 'BBG111111111',
    ticker: 'TECH',
    weight: 10,
  },
  {
    figi: 'BBG000CSZKR2',
    ticker: 'MBT',
    weight: 30,
  },
  {
    ticker: 'TBIO',
    weight: 10,
  },
];

const totalWeight = weights.map((w) => w.weight).reduce((a, b) => a + b);

export const isUnderWeight = ({ figi, percent }: IPosition) => {
  const item = weights.find((w) => w.figi == figi);
  if (!item) {
    return;
  }
  return (100 * item.weight) / totalWeight > percent;
};
