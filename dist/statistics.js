"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var incremean_1 = require("incremean");
var Statistics = (function () {
    function Statistics() {
        this.stats = {
            time: {
                avg: new incremean_1.default(),
                max: Number.MIN_SAFE_INTEGER,
                min: Number.MAX_SAFE_INTEGER,
            },
        };
    }
    Statistics.prototype.addStatistics = function (key, value) {
        if (!this.stats[key]) {
            this.stats[key] = {
                avg: new incremean_1.default(),
                max: value,
                min: value,
            };
        }
        else {
            if (value > this.stats[key].max) {
                this.stats[key].max = value;
            }
            if (value < this.stats[key].min) {
                this.stats[key].min = value;
            }
        }
        this.stats[key].avg.add(value);
    };
    Statistics.prototype.getStatistics = function () {
        return this.stats;
    };
    return Statistics;
}());
exports.default = Statistics;
