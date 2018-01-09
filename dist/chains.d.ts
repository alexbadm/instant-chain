import ExchangeState from 'exchange-reactive-state';
export interface Rules {
    [idx: string]: string[];
}
export interface Prices {
    [pair: string]: [number, number, boolean];
}
export declare const coins: string[];
export declare const symbols: string[];
export default class Chains {
    private exchangeState;
    private pairRules;
    private pairReverseRules;
    private tradingCoins;
    private tradingPairs;
    constructor(exchangeState: ExchangeState, constraint: string[]);
    calculateAllPrices(): Prices;
    calculateChains(limit?: number, threshold?: number): [number, string, string, string][];
    coins(): string[];
    pairs(): string[];
}
