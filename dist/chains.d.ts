import { Store } from 'exchange-reactive-state/dist/reducers';
declare const pairs: string[];
declare function calculateChains(exState: Store, limit?: number, threshold?: number): [number, string, string, string][];
export { pairs, calculateChains };
