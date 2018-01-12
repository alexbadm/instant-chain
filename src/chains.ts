import { OrderRequest } from 'bfx-api/dist/bitfinexTypes';
import ExchangeState from 'exchange-reactive-state';

export interface Rules { [idx: string]: string[]; }

export interface Prices { [pair: string]: [ number, number, boolean ]; }

export type Chain = [ string, string, string ];

export type SuggestedChain = [ number, string, string, string, OrderRequest[] ];

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
  public readonly fee: number = 0.002;

  private pairRules: Rules;
  private pairReverseRules: Rules;

  private tradingCoins: string[];
  private tradingPairs: string[];

  private allChains: Chain[];

  constructor(private exchangeState: ExchangeState, constraint: string[]) {
    if (!constraint || !constraint.length) {
      this.tradingCoins = coins;
      this.tradingPairs = symbols;
    } else {
      // USD must be always included
      if (!~constraint.indexOf('USD')) {
        constraint.push('USD');
      }
      this.tradingCoins = coins.filter((c) => ~constraint.indexOf(c));
      this.tradingPairs = symbols.filter((s) => ~constraint.indexOf(s.slice(0, 3)) && ~constraint.indexOf(s.slice(3)));
    }

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

    this.allChains = this.tradingCoins.reduce((results, coin1) => {
      this.makeLevel(coin1).forEach((coin2) => {
        this.makeLevel(coin2).forEach((coin3) => {
          if (coin3 !== coin1) {
            results.push([ coin1, coin2, coin3 ]);
          }
        });
      });
      return results;
    }, [] as Chain[]);
  }

  public makeLevel(coin: string): string[] {
    return (this.pairRules[coin] && this.pairReverseRules[coin]
      ? this.pairRules[coin].concat(this.pairReverseRules[coin])
      : this.pairRules[coin] || this.pairReverseRules[coin] || [])
      .filter((c) => c !== coin);
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

  public calculateChains(threshold: number = 0, usdToTrade: number = 30): SuggestedChain[] {
    const prices = this.calculateAllPrices();
    const fee = this.fee;

    function makeOrderRequest(coin: string, currency: string, fees: number = 0): OrderRequest {
      const isDirect = prices[coin + currency][2];
      const price = (prices[coin + currency][0]).toString(10);
      const sellCoin = isDirect ? coin : currency;
      // tslint:disable-next-line:no-shadowed-variable
      const feeRate = 1 - fees * fee;
      const coinSellAmount = ((sellCoin === 'USD') ? usdToTrade
        : usdToTrade / prices[sellCoin + 'USD'][0]) * feeRate;

      const orderRequest: OrderRequest = isDirect ? {
        amount: (-coinSellAmount).toString(10),
        price,
        symbol: 't' + coin + currency,
        type: 'EXCHANGE MARKET',
      } : {
        amount: coinSellAmount.toString(10),
        price,
        symbol: 't' + currency + coin,
        type: 'EXCHANGE MARKET',
      };
      return orderRequest;
    }

    const baseCurrencySum = 100;
    const feeRate = 1 - this.fee;

    return this.allChains.reduce((result, chain) => {
      const prices1 = prices[chain[0] + chain[1]];
      const prices2 = prices[chain[1] + chain[2]];
      const prices3 = prices[chain[2] + chain[0]];
      if (!prices1 || !prices2 || !prices3) {
        return result;
      }

      const step1Index = feeRate * baseCurrencySum * prices1[0];
      const step2Index = feeRate * step1Index * prices2[0];
      const summaryIndex = feeRate * step2Index * prices3[0];
      const profit = Math.round((summaryIndex / baseCurrencySum - 1) * 10000) / 100;

      if (profit > threshold) {
        result.push([
          profit,
          chain[0],
          chain[1],
          chain[2],
          [
            makeOrderRequest(chain[0], chain[1], 0),
            makeOrderRequest(chain[1], chain[2], 1),
            makeOrderRequest(chain[2], chain[0], 2),
          ],
        ]);
      }

      return result;
    }, [] as SuggestedChain[]);
  }

  public coins() {
    return this.tradingCoins;
  }

  public pairs() {
    return this.tradingPairs;
  }

  public chains() {
    return this.allChains;
  }
}
