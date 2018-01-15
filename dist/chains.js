"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coins = [
    'BTC', 'USD', 'LTC', 'ETH', 'ETC', 'RRT', 'ZEC', 'XMR', 'DSH', 'EUR', 'XRP',
    'IOT', 'EOS', 'SAN', 'OMG', 'BCH', 'NEO', 'ETP', 'QTM', 'AVT', 'EDO', 'BTG',
    'DAT', 'QSH', 'YYW', 'GNT', 'SNT', 'BAT', 'MNA', 'FUN', 'ZRX', 'TNB', 'SPK',
];
exports.symbols = [
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
var Chains = (function () {
    function Chains(exchangeState, constraint) {
        var _this = this;
        this.exchangeState = exchangeState;
        this.fee = 0.002;
        if (!constraint || !constraint.length) {
            this.tradingCoins = exports.coins;
            this.tradingPairs = exports.symbols;
        }
        else {
            if (!~constraint.indexOf('USD')) {
                constraint.push('USD');
            }
            this.tradingCoins = exports.coins.filter(function (c) { return ~constraint.indexOf(c); });
            this.tradingPairs = exports.symbols.filter(function (s) { return ~constraint.indexOf(s.slice(0, 3)) && ~constraint.indexOf(s.slice(3)); });
        }
        this.pairRules = this.tradingPairs.reduce(function (result, pair) {
            var coin = pair.slice(0, 3);
            var currency = pair.slice(3);
            if (result[coin]) {
                result[coin].push(currency);
            }
            else {
                result[coin] = [currency];
            }
            return result;
        }, {});
        this.pairReverseRules = Object.keys(this.pairRules).reduce(function (result, coin) {
            _this.pairRules[coin].forEach(function (currency) {
                if (result[currency]) {
                    result[currency].push(coin);
                }
                else {
                    result[currency] = [coin];
                }
            });
            return result;
        }, {});
        this.allChains = this.tradingCoins.reduce(function (results, coin1) {
            _this.makeLevel(coin1).forEach(function (coin2) {
                _this.makeLevel(coin2).forEach(function (coin3) {
                    if (coin3 !== coin1) {
                        results.push([coin1, coin2, coin3]);
                    }
                });
            });
            return results;
        }, []);
    }
    Chains.prototype.makeLevel = function (coin) {
        return (this.pairRules[coin] && this.pairReverseRules[coin]
            ? this.pairRules[coin].concat(this.pairReverseRules[coin])
            : this.pairRules[coin] || this.pairReverseRules[coin] || [])
            .filter(function (c) { return c !== coin; });
    };
    Chains.prototype.calculateAllPrices = function () {
        var rates = this.exchangeState.getState().rates;
        var allPrices = {};
        this.tradingPairs.forEach(function (pair) {
            var rPair = pair.slice(3) + pair.slice(0, 3);
            if (rates[pair]) {
                allPrices[pair] = [rates[pair][0], rates[pair][2], true];
                allPrices[rPair] = [1 / rates[pair][2], 1 / rates[pair][0], false];
            }
        });
        return allPrices;
    };
    Chains.prototype.calculateChains = function (threshold, usdToTrade) {
        if (threshold === void 0) { threshold = 0; }
        if (usdToTrade === void 0) { usdToTrade = 30; }
        var prices = this.calculateAllPrices();
        var fee = this.fee;
        function makeOrderRequest(coin, currency, fees) {
            if (fees === void 0) { fees = 0; }
            var isDirect = prices[coin + currency][2];
            var pair = isDirect ? coin + currency : currency + coin;
            var sellCoin = isDirect ? coin : currency;
            var feeRate = 1 - fees * fee;
            var coinSellAmount = ((sellCoin === 'USD') ? usdToTrade
                : usdToTrade / prices[sellCoin + 'USD'][0]) * feeRate;
            return {
                amount: (isDirect ? -coinSellAmount : coinSellAmount).toString(10),
                price: (prices[pair][0]).toString(10),
                symbol: 't' + pair,
                type: 'EXCHANGE MARKET',
            };
        }
        var baseCurrencySum = 100;
        var feeRate = 1 - this.fee;
        return this.allChains.reduce(function (result, chain) {
            var prices1 = prices[chain[0] + chain[1]];
            var prices2 = prices[chain[1] + chain[2]];
            var prices3 = prices[chain[2] + chain[0]];
            if (!prices1 || !prices2 || !prices3) {
                return result;
            }
            var step1Index = feeRate * baseCurrencySum * prices1[0];
            var step2Index = feeRate * step1Index * prices2[0];
            var summaryIndex = feeRate * step2Index * prices3[0];
            var profit = Math.round((summaryIndex / baseCurrencySum - 1) * 10000) / 100;
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
        }, []);
    };
    Chains.prototype.coins = function () {
        return this.tradingCoins;
    };
    Chains.prototype.pairs = function () {
        return this.tradingPairs;
    };
    Chains.prototype.chains = function () {
        return this.allChains;
    };
    return Chains;
}());
exports.default = Chains;
