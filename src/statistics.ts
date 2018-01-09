import Incremean from 'incremean';

export interface ItemStatistics {
  avg: Incremean;
  max: number;
  min: number;
}

export interface Stats { [chain: string]: ItemStatistics; }

export default class Statistics {
  private stats: Stats;
  constructor() {
    this.stats = {
      time: {
        avg: new Incremean(),
        max: Number.MIN_SAFE_INTEGER,
        min: Number.MAX_SAFE_INTEGER,
      },
    };
  }

  public addStatistics(key: string, value: number) {
    if (!this.stats[key]) {
      this.stats[key] = {
        avg: new Incremean(),
        max: value,
        min: value,
      };
    } else {
      if (value > this.stats[key].max) {
        this.stats[key].max = value;
      }
      if (value < this.stats[key].min) {
        this.stats[key].min = value;
      }
    }
    this.stats[key].avg.add(value);
  }

  public getStatistics() {
    return this.stats;
  }
}
