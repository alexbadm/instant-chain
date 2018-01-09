import Incremean from 'incremean';
export interface ItemStatistics {
    avg: Incremean;
    max: number;
    min: number;
}
export interface Stats {
    [chain: string]: ItemStatistics;
}
export default class Statistics {
    private stats;
    constructor();
    addStatistics(key: string, value: number): void;
    getStatistics(): Stats;
}
