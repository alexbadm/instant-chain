import * as cors from 'cors';
import ExchangeState from 'exchange-reactive-state';
import * as express from 'express';
import { calculateChains, pairs } from './chains';
import Statistics from './statistics';

function authError(e: any) {
  global.console.log('failed to authorize', e);
}

function subsError(e: any) {
  global.console.log('failed to subscribe', e);
}

const state = new ExchangeState();
const API_KEY = process.env.API_KEY || '';
const API_SECRET = process.env.API_SECRET || '';

state.auth(API_KEY, API_SECRET).catch(authError);
pairs.forEach((pair) => state.subscribeTicker(pair).catch(subsError));
state.start();

const stats = new Statistics();

setInterval(() => {
  const before = Date.now();
  const topChains = calculateChains(state.getState(), 6, 0.2);
  const after = Date.now();

  const time = after - before;
  stats.addStatistics('time', time);
  topChains.forEach((res) => stats.addStatistics(`${res[1]}-${res[2]}-${res[3]}-${res[1]}`, res[0]));
}, process.env.INTERVAL || 3000);

const server = express();
// server.use(express.json());
server.use(cors());

server.get('/state', (_, res) => {
  res.json(state.getState()).end();
});

server.get('/statistics', (_, res) => {
  res.json(stats.getStatistics()).end();
});

const port = process.env.PORT || 3000;
server.listen(port, () => global.console.log('server is listening on ' + port));
