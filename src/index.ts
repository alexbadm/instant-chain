import * as cors from 'cors';
import ExchangeState from 'exchange-reactive-state';
import * as express from 'express';
import Chains from './chains';
import Statistics from './statistics';

const apiKey = process.env.API_KEY || '';
const apiSecret = process.env.API_SECRET || '';
const constraint = process.env.CONSTRAINT;
const constraints = typeof constraint === 'string' ? constraint.split(',') : [];
const interval = Number(process.env.INTERVAL) || 3000;
const port = process.env.PORT || 3000;

const state = new ExchangeState();
const chains = new Chains(state, constraints);
const stats = new Statistics();

state.auth(apiKey, apiSecret).catch(authError);
chains.pairs().forEach((pair) => state.subscribeTicker(pair).catch(subsError));
state.start();

setInterval(() => {
  const before = Date.now();
  const topChains = chains.calculateChains(6, 0.1);
  const after = Date.now();

  const time = after - before;
  stats.addStatistics('time', time);
  topChains.forEach((res) => stats.addStatistics(`${res[1]}-${res[2]}-${res[3]}-${res[1]}`, res[0]));
}, interval);

const server = express();
// server.use(express.json());
server.use(cors());

server.get('/state', (_, res) => {
  res.json(state.getState()).end();
});

server.get('/statistics', (_, res) => {
  res.json(stats.getStatistics()).end();
});

server.get('/oftenChains/:limit', (req, res) => {
  const limit = req.params.limit;
  const st = stats.getStatistics();
  const oftenChains = Object.keys(st)
    .sort((a1, a2) => st[a2].avg.getCounter() - st[a1].avg.getCounter())
    .slice(0, limit)
    .reduce((result, key) => {
      const avg = st[key].avg;
      result[key] = {
        avgProfit: `+${Math.round(avg.getMean() * 100) / 100}%`,
        count: avg.getCounter(),
        ratio: Math.round(avg.getCounter() / st.time.avg.getCounter() * 100) + '%',
      };
      return result;
    }, {} as { [idx: string]: any });
  res.json(oftenChains).end();
});

server.listen(port, () => global.console.log('server is listening on ' + port));

function authError(e: any) {
  global.console.log('failed to authorize', e);
}

function subsError(e: any) {
  global.console.log('failed to subscribe', e);
}
