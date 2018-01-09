"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cors = require("cors");
var exchange_reactive_state_1 = require("exchange-reactive-state");
var express = require("express");
var chains_1 = require("./chains");
var statistics_1 = require("./statistics");
function authError(e) {
    global.console.log('failed to authorize', e);
}
function subsError(e) {
    global.console.log('failed to subscribe', e);
}
var state = new exchange_reactive_state_1.default();
var API_KEY = process.env.API_KEY || '';
var API_SECRET = process.env.API_SECRET || '';
state.auth(API_KEY, API_SECRET).catch(authError);
chains_1.pairs.forEach(function (pair) { return state.subscribeTicker(pair).catch(subsError); });
state.start();
var stats = new statistics_1.default();
setInterval(function () {
    var before = Date.now();
    var topChains = chains_1.calculateChains(state.getState(), 6, 0.3);
    var after = Date.now();
    var time = after - before;
    stats.addStatistics('time', time);
    topChains.forEach(function (res) { return stats.addStatistics(res[1] + "-" + res[2] + "-" + res[3] + "-" + res[1], res[0]); });
}, process.env.INTERVAL || 3000);
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
var port = process.env.PORT || 3000;
server.listen(port, function () { return global.console.log('server is listening on ' + port); });
