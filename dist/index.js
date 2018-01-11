"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cors = require("cors");
var exchange_reactive_state_1 = require("exchange-reactive-state");
var express = require("express");
var chains_1 = require("./chains");
var statistics_1 = require("./statistics");
var apiKey = process.env.API_KEY || '';
var apiSecret = process.env.API_SECRET || '';
var constraint = process.env.CONSTRAINT;
var constraints = typeof constraint === 'string' ? constraint.split(',') : [];
var interval = Number(process.env.INTERVAL) || 3000;
var port = process.env.PORT || 3000;
var state = new exchange_reactive_state_1.default();
var chains = new chains_1.default(state, constraints);
var stats = new statistics_1.default();
state.auth(apiKey, apiSecret).catch(authError);
chains.pairs().forEach(function (pair) { return state.subscribeTicker(pair).catch(subsError); });
state.start();
var allowTrade = true;
setInterval(function () {
    var before = Date.now();
    var suggests = chains.calculateChains(0);
    var topChains = suggests.sort(function (a, b) { return b[0] - a[0]; });
    var after = Date.now();
    var leader = topChains[0];
    if (leader) {
        global.console.log('\nBest chain:', leader);
        if (allowTrade) {
            allowTrade = false;
            state.api.newOrders(leader[4])
                .then(function (msg) {
                global.console.log('trade success', msg);
            })
                .catch(function (msg) { return global.console.log('trade fail', msg); });
        }
    }
    var time = after - before;
    stats.addStatistics('time', time);
    topChains.forEach(function (res) { return stats.addStatistics(res[1] + "-" + res[2] + "-" + res[3] + "-" + res[1], res[0]); });
}, interval);
var server = express();
server.use(cors());
server.get('/state', function (_, res) {
    res.json(state.getState()).end();
});
server.get('/statistics', function (_, res) {
    res.json(stats.getStatistics()).end();
});
server.get('/oftenChains/:limit', function (req, res) {
    var limit = req.params.limit;
    var st = stats.getStatistics();
    var oftenChains = Object.keys(st)
        .sort(function (a1, a2) { return st[a2].avg.getCounter() - st[a1].avg.getCounter(); })
        .slice(0, limit)
        .reduce(function (result, key) {
        var avg = st[key].avg;
        result[key] = {
            avgProfit: "+" + Math.round(avg.getMean() * 100) / 100 + "%",
            count: avg.getCounter(),
            ratio: Math.round(avg.getCounter() / st.time.avg.getCounter() * 100) + '%',
        };
        return result;
    }, {});
    res.json(oftenChains).end();
});
server.listen(port, function () { return global.console.log('server is listening on ' + port); });
function authError(e) {
    global.console.log('failed to authorize', e);
}
function subsError(e) {
    global.console.log('failed to subscribe', e);
}
