"use strict";

module.exports = function(web3) {
    web3.miner = web3.miner ? web3.miner : {};

    if (typeof web3.miner.start === "undefined") {
        /**
         * @param {!number} threadCount. The number of threads to start.
         * @param {!function} callback - Node-type callback: error, hex number as string.
         */
        web3.miner.start = function(threadCount, callback) {
            web3.currentProvider.sendAsync(
                {
                    jsonrpc: "2.0",
                    method: "miner_start",
                    params: [ threadCount ],
                    id: new Date().getTime()
                },
                (error, result) => callback(error, error ? result : result.result));
        };
    }

    if (typeof web3.miner.stop === "undefined") {
        /**
         * @param {!function} callback - Node-type callback: error, boolean.
         */
        web3.miner.stop = function(callback) {
            web3.currentProvider.sendAsync(
                {
                    jsonrpc: "2.0",
                    method: "miner_stop",
                    params: [],
                    id: new Date().getTime()
                },
                (error, result) => callback(error, error ? result : result.result));
        };
    }
};