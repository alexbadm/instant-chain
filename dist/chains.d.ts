import { OrderRequest } from 'bfx-api/dist/bitfinexTypes';
import ExchangeState from 'exchange-reactive-state';
export interface Rules {
    [idx: string]: string[];
}
export interface Prices {
    [pair: string]: [number, number, boolean];
}
export declare type Chain = [string, string, string];
export declare type SuggestedChain = [number, string, string, string, OrderRequest[]];
export declare const coins: string[];
export declare const symbols: string[];
export default class Chains {
    private exchangeState;
    readonly fee: number;
    private pairRules;
    private pairReverseRules;
    private tradingCoins;
    private tradingPairs;
    private allChains;
    constructor(exchangeState: ExchangeState, constraint: string[]);
    makeLevel(coin: string): string[];
    calculateAllPrices(): Prices;
    calculateChains(threshold?: number, usdToTrade?: number): SuggestedChain[];
    coins(): string[];
    pairs(): string[];
    chains(): [string, string, string][];
}
