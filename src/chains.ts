import ExchangeState from 'exchange-reactive-state';

export interface Rules { [idx: string]: string[]; }

export interface Prices { [pair: string]: [ number, number, boolean ]; }

// fetch('https://api.bitfinex.com/v1/symbols').then((resp) => resp.json()).then((s) => symbols = s);
export const coins = [
  'BTC', 'USD', 'LTC', 'ETH', 'ETC', 'RRT', 'ZEC', 'XMR', 'DSH', 'EUR', 'XRP',
  'IOT', 'EOS', 'SAN', 'OMG', 'BCH', 'NEO', 'ETP', 'QTM', 'AVT', 'EDO', 'BTG',
  'DAT', 'QSH', 'YYW', 'GNT', 'SNT', 'BAT', 'MNA', 'FUN', 'ZRX', 'TNB', 'SPK',
];

export const symbols = [
  'BTCUSD', 'LTCUSD', 'LTCBTC', 'ETHUSD', 'ETHBTC', 'ETCBTC', 'ETCUSD',
  'RRTUSD', 'RRTBTC', 'ZECUSD', 'ZECBTC', 'XMRUSD', 'XMRBTC', 'DSHUSD',
  'DSHBTC', 'BTCEUR', 'XRPUSD', 'XRPBTC', 'IOTUSD', 'IOTBTC', 'IOTETH',
  'EOSUSD', 'EOSBTC', 'EOSETH', 'SANUSD', 'SANBTC', 'SANETH', 'OMGUSD',
  'OMGBTC', 'OMGETH', 'BCHUSD', 'BCHBTC', 'BCHETH', 'NEOUSD', 'NEOBTC',
  'NEOETH', 'ETPUSD', 'ETPBTC', 'ETPETH', 'QTMUSD', 'QTMBTC', 'QTMETH',
  'AVTUSD', 'AVTBTC', 'AVTETH', 'EDOUSD', 'EDOBTC', 'EDOETH', 'BTGUSD',
  'BTGBTC', 'DATUSD', 'DATBTC', 'DATETH', 'QSHUSD', 'QSHBTC', 'QSHETH',
  'YYWUSD', 'YYWBTC', 'YYWETH', 'GNTUSD', 'GNTBTC', 'GNTETH', 'SNTUSD',
  'SNTBTC', 'SNTETH', 'IOTEUR', 'BATUSD', 'BATBTC', 'BATETH', 'MNAUSD',
  'MNABTC', 'MNAETH', 'FUNUSD', 'FUNBTC', 'FUNETH', 'ZRXUSD', 'ZRXBTC',
  'ZRXETH', 'TNBUSD', 'TNBBTC', 'TNBETH', 'SPKUSD', 'SPKBTC', 'SPKETH',
];

export default class Chains {
  // private coins: string[];
  // private symbols: string[];

  private pairRules: Rules;
  private pairReverseRules: Rules;

  private tradingCoins: string[];
  private tradingPairs: string[];

  constructor(private exchangeState: ExchangeState, constraint: string[]) {
    // this.coins = coins;
    // this.symbols = symbols;
    this.tradingCoins = coins.filter((c) => ~constraint.indexOf(c));
    this.tradingPairs = symbols.filter((s) => ~constraint.indexOf(s.slice(0, 3)) && ~constraint.indexOf(s.slice(3)));

    this.pairRules = this.tradingPairs.reduce((result, pair) => {
      const coin = pair.slice(0, 3);
      const currency = pair.slice(3);
      if (result[coin]) {
        result[coin].push(currency);
      } else {
        result[coin] = [currency];
      }
      return result;
    }, {} as Rules);

    this.pairReverseRules = Object.keys(this.pairRules).reduce((result, coin) => {
      this.pairRules[coin].forEach((currency) => {
        if (result[currency]) {
          result[currency].push(coin);
        } else {
          result[currency] = [coin];
        }
      });
      return result;
    }, {} as Rules);
  }

  public calculateAllPrices(): Prices {
    const { rates } = this.exchangeState.getState();
    const allPrices: Prices = {};
    this.tradingPairs.forEach((pair) => {
      const rPair = pair.slice(3) + pair.slice(0, 3);
      if (rates[pair]) {
        allPrices[pair] = [ rates[pair][0], rates[pair][2], true ];
        allPrices[rPair] = [ 1 / rates[pair][2], 1 / rates[pair][0], false ];
      }
    });
    return allPrices;
  }

  public calculateChains(limit: number = 0, threshold: number = 0) {
    const prices = this.calculateAllPrices();
    const results: Array<[ number, string, string, string ]> = [];
    this.tradingCoins.forEach((baseCurrency) => {
      const level1 = this.pairRules[baseCurrency]
        ? this.pairRules[baseCurrency].concat(this.pairReverseRules[baseCurrency])
        : this.pairReverseRules[baseCurrency];
      // global.console.log('baseCurrency', baseCurrency, 'level1', level1);
      if (!level1) {
        return;
      }

      const baseCurrencySum = 100;

      level1.forEach((step1Currency) => {
        const pair = baseCurrency + step1Currency;
        if (!prices[pair]) {
          return;
        }

        const level2 = this.pairRules[step1Currency]
          ? this.pairRules[step1Currency].concat(this.pairReverseRules[step1Currency])
          : this.pairReverseRules[step1Currency];

        if (!level2) {
          return;
        }

        const step1Index = baseCurrencySum * prices[pair][0];

        level2.forEach((step2Currency) => {
          const pair2 = step1Currency + step2Currency;
          if (!prices[pair2]) {
            return;
          }

          const step2Index = step1Index * prices[pair2][0];

          const pair3 = step2Currency + baseCurrency;
          if (!prices[pair3]) {
            return;
          }

          const summaryIndex = step2Index * prices[pair3][0];
          const profit = Math.round((summaryIndex / baseCurrencySum - 1) * 10000) / 100;
          results.push([
            profit,
            baseCurrency,
            step1Currency,
            step2Currency,
          ]);
        });
        // global.console.log('price for pair', pair, 'is', prices[pair]);
      });
    });
    const leaders = results
      .filter((res) => res[0] > threshold)
      .sort((a, b) => b[0] - a[0]);

    return (limit === 0 || leaders.length <= limit) ? leaders : leaders.slice(0, limit);
  }

  public coins() {
    return this.tradingCoins;
  }

  public pairs() {
    return this.tradingPairs;
  }
}
