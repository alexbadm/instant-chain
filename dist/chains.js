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
        if (!constraint || !constraint.length) {
            this.tradingCoins = exports.coins;
            this.tradingPairs = exports.symbols;
        }
        else {
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
    }
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
    Chains.prototype.calculateChains = function (limit, threshold) {
        var _this = this;
        if (limit === void 0) { limit = 0; }
        if (threshold === void 0) { threshold = 0; }
        var prices = this.calculateAllPrices();
        var results = [];
        this.tradingCoins.forEach(function (baseCurrency) {
            var level1 = _this.pairRules[baseCurrency]
                ? _this.pairRules[baseCurrency].concat(_this.pairReverseRules[baseCurrency])
                : _this.pairReverseRules[baseCurrency];
            if (!level1) {
                return;
            }
            var baseCurrencySum = 100;
            level1.forEach(function (step1Currency) {
                var pair = baseCurrency + step1Currency;
                if (!prices[pair]) {
                    return;
                }
                var level2 = _this.pairRules[step1Currency]
                    ? _this.pairRules[step1Currency].concat(_this.pairReverseRules[step1Currency])
                    : _this.pairReverseRules[step1Currency];
                if (!level2) {
                    return;
                }
                var step1Index = baseCurrencySum * prices[pair][0];
                level2.forEach(function (step2Currency) {
                    var pair2 = step1Currency + step2Currency;
                    if (!prices[pair2]) {
                        return;
                    }
                    var step2Index = step1Index * prices[pair2][0];
                    var pair3 = step2Currency + baseCurrency;
                    if (!prices[pair3]) {
                        return;
                    }
                    var summaryIndex = step2Index * prices[pair3][0];
                    var profit = Math.round((summaryIndex / baseCurrencySum - 1) * 10000) / 100;
                    results.push([
                        profit,
                        baseCurrency,
                        step1Currency,
                        step2Currency,
                    ]);
                });
            });
        });
        var leaders = results
            .filter(function (res) { return res[0] > threshold; })
            .sort(function (a, b) { return b[0] - a[0]; });
        return (limit === 0 || leaders.length <= limit) ? leaders : leaders.slice(0, limit);
    };
    Chains.prototype.coins = function () {
        return this.tradingCoins;
    };
    Chains.prototype.pairs = function () {
        return this.tradingPairs;
    };
    return Chains;
}());
exports.default = Chains;
