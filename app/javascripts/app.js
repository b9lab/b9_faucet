// Import libraries we need.
import { default as BigNumber } from 'bignumber.js';
import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract'
import { default as Promise } from 'bluebird';
import { default as $ } from 'jquery';

// Import our contract artifacts and turn them into usable abstractions.
import throttledFaucetArtifacts from '../../build/contracts/ThrottledFaucet.json'

// ThrottledFaucet is our usable abstraction, which we'll use through the code below.
const ThrottledFaucet = contract(throttledFaucetArtifacts);
window.ThrottledFaucet = ThrottledFaucet;

import { languageSelection } from "./language.js";

// Declare the possible web3 providers
const rpcEndPoints = [
    "http://localhost:8545",
    "https://ropsten.infura.io/"
];

const faucetUrls = {
    "2": "https://morden.faucet.b9lab.com/tap",
    "3": "https://ropsten.faucet.b9lab.com/tap"
};

const etherscanUrls = {
    "3": "https://ropsten.etherscan.io/"
}

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
let account;

window.addEventListener('load', async function() {
    await window.App.start();
});

window.App = {
    params: {
        /**
         * @type {number}
         */
        networkId: undefined,

        /**
         * @type {string}
         */
        etherscanUrl: undefined,

        /**
         * @type {string.<address>}
         */
        owner: undefined,

        /**
         * The next timestamp at which it is possible to withdraw
         */
        nextTimestamp: 0,

        /**
         * The interval that counts down.
         */
        intervalTimestamp: undefined,

        /**
         * The event filter
         */
        logPaidFilter: undefined
    },

    /**
     * @returns {!Promise}
     */
    start: function() {
        const self = this;
        // Extend jQuery with our language translator.
        $.fn.extend({
            textByKey: function(textKey) {
                return this.text(languageSelection.getTranslatedString(textKey));
            },
            replaceTextByKey: function() {
                this.each((index, element) => {
                    $(element).textByKey($(element).attr("b9-data-text-key"));
                });
            },
            attrByKey: function(attrName, textKey) {
                return this.attr(attrName, languageSelection.getTranslatedString(textKey));
            },
            replaceTitleByKey: function(attrName) {
                this.each((index, element) => {
                    $(element).attrByKey("title", $(element).attr("b9-data-title-key"));
                });
            }
        });
        return Promise.all([
                this.initUI(),    
                App.findBestWeb3()
                    .then(web3Instance => {
                        $(".web3-not-there").removeClass("web3-not-there").addClass("web3-there");
                        ThrottledFaucet.setProvider(web3.currentProvider);

                        if (typeof window.ethereum !== "undefined") {
                            $(".is-not-eip-1102").removeClass("is-not-eip-1102").addClass("is-eip-1102");
                        }

                        // Get the initial account balance so it can be displayed.
                        return window.web3.eth.getAccountsPromise();
                    })
                    .then(accounts => self.handleAccounts(accounts))
                    .then(() => self.refreshStatics()) // We need this syntax for `this` to be correct
                    .then(() => self.listenToLogPaid())
                    .then(() => self.countDown())
            ])
            .catch(console.error);
    },

    /**
     * @returns {!Promise}
     */
    initUI: function() {
        document.querySelector('#languageSelection [value="' + languageSelection.selectedLanguage + '"]').selected = true;
        $(document).prop('title', languageSelection.getTranslatedString("page-title"));
        $("[b9-data-text-key]").replaceTextByKey();
        $("[b9-data-title-key]").replaceTitleByKey();

        // fetch faucet status from (public) status api
        return fetch("https://jd4vq2xzq1.execute-api.eu-west-1.amazonaws.com/default/faucetHealthChecks", {
                method: 'POST',
                headers: {
                    'x-api-key': 'YNJhZDsdUX7PBylg8HwVaMSgf5jOWGP5houZipEa'
                }
            })
            .then(res => res.json())
            .then(response => $(".status-loading")
                .removeClass("status-loading")
                .addClass(response.allRunning ? "status-online" : "status-offline")
            );
    },

    /**
     * @returns {!Promise.<Web3>}
     */
    findBestWeb3: function() {
        const self = this;
        let promise;
        // Checking if Web3 has been injected by the browser (Mist/MetaMask)
        if (typeof web3 !== 'undefined') {
            // Use Mist/MetaMask's provider
            promise = Promise.resolve(new Web3(web3.currentProvider))
                .then(web3Instance => App.prepareWeb3(web3Instance));
        } else {
            promise = rpcEndPoints.reduce(
                (promiseAttempt, rpcEndPoint) => promiseAttempt
                .catch(error => Promise.resolve(new Web3(new Web3.providers.HttpProvider(rpcEndPoint)))
                    .then(web3Instance => App.prepareWeb3(web3Instance))
                ),
                Promise.reject(new Error(languageSelection.getTranslatedString("err-2")))
            );
        }

        return promise
            .then(web3Instance => {
                window.web3 = web3Instance;
                console.debug("Using web3 provider", web3Instance.currentProvider);
                return web3Instance;
            })
            .catch(error => {
                console.error(error);
                $("#web3_status").textByKey("err-3");
                throw error;
            });
    },

    /**
     * @returns {!Promise.<Web3>}
     */
    prepareWeb3: function(web3Instance) {
        const self = this;
        web3Instance = self.promisifyWeb3(web3Instance);
        return web3Instance.version.getNetworkPromise()
            .then(network => {
                self.params.networkId = network;
                self.params.etherscanUrl = etherscanUrls[network];
                return web3Instance;
            });
    },

    /**
     * @returns {!Web3}
     */
    promisifyWeb3: function(web3Instance) {
        Promise.promisifyAll(web3Instance.eth, {
            suffix: "Promise"
        });
        Promise.promisifyAll(web3Instance.version, {
            suffix: "Promise"
        });
        Promise.promisifyAll(web3Instance.net, {
            suffix: "Promise"
        });
        web3Instance.eth.getTransactionReceiptMined = require("../../utils/getTransactionReceiptMined.js");
        return web3Instance;
    },

    /**
     * @returns {!Promise}
     */
    unlockAccounts: function() {
        $("#btn_unlock").attr("disabled", true);
        const self = this;
        return window.ethereum.enable()
            .then(accounts => self.handleAccounts(accounts))
            .catch(error => {
                console.error(error);
                $("#btn_unlock").attr("disabled", false);
                $("#send_tx_error").text(languageSelection.getTranslatedString("err-4") + " " + JSON.stringify(error.message));
                $("#send_tx_error_para").css("visibility", "visible");
            });
    },

    /**
     * @param accounts {!Array<String<Address>>}
     * @returns { !Promise}
     */
    handleAccounts: function(accounts) {
        const self = this;
        if (accounts.length == 0) {
            window.account = undefined;
        } else {
            $(".has-no-account").removeClass("has-no-account").addClass("has-account");
            window.account = accounts[0];
            $("#your_address").html(window.account);
            if (typeof self.params.etherscanUrl !== "undefined") {
                $("#your_address").attr("href", self.params.etherscanUrl + "address/" + window.account);
            } else {
                $("#your_address").attr("title", languageSelection.getTranslatedString("err-1"));
            }
            $("#recipient").val(window.account);
        }
        return this.refreshBalances();
    },

    /**
     * Needed to bypass Web3's BigNumber bug. web3.fromWei()
     * @returns {!BigNumber}
     */
    fromWei: function(bigNumber) {
        return new BigNumber(bigNumber).dividedBy(web3.toWei(1));
    },

    /**
     * @returns {!Promise}
     */
    refreshStatics: function() {
        const self = this;
        return Promise.delay(1) // This delay circumvents a Mist bug
            .then(ThrottledFaucet.deployed)
            .then(instance => {
                $(".faucet-not-there").removeClass("faucet-not-there").addClass("faucet-there");
                $("#address").html(instance.address);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#address").attr("href", self.params.etherscanUrl + "address/" + instance.address);
                } else {
                    $("#address").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return instance.getOwner()
                    .catch(error => {
                        console.error(error);
                        $("#owner").textByKey("err");
                        throw error;
                    })
                    .then(owner => {
                        self.params.owner = owner;
                        $("#owner").html(owner);
                        if (typeof self.params.etherscanUrl !== "undefined") {
                            $("#owner").attr("href", self.params.etherscanUrl + "address/" + owner);
                        } else {
                            $("#owner").attr("title", languageSelection.getTranslatedString("err-1"));
                        }
                        console.log(owner, "is owner:", window.account, owner == window.account);
                        if (owner == window.account) {
                            $(".is-not-owner").removeClass("is-not-owner").addClass("is-owner");
                        }
                        return instance.getGiveAway();
                    })
                    .catch(error => {
                        console.error(error);
                        $("#give_away").textByKey("err");
                        throw error;
                    })
                    .then(giveAway => $("#give_away").html(self.fromWei(giveAway).toString(10)));
            });
    },

    /**
     * @returns {!Promise}
     */
    refreshBalances: function() {
        const self = this;
        let promise;
        if (typeof window.account !== "undefined") {
            promise = web3.eth.getBalancePromise(window.account)
                .then(balance => $("#your_balance").html(self.fromWei(balance).toString(10)))
                .catch(error => {
                    console.error(error);
                    $("#your_balance").textByKey("err");
                    throw error;
                });
        } else {
            $("#your_balance").html("N/A");
            promise = Promise.resolve();
        }
        return promise
            .then(ThrottledFaucet.deployed)
            .then(instance => web3.eth.getBalancePromise(instance.address))
            .then(balance => $("#faucet_balance").html(self.fromWei(balance).toString(10)))
            .catch(error => {
                console.error(error);
                $("#faucet_balance").textByKey("err");
                throw error;
            });
    },

    /**
     * @returns {!Promise}
     */
    listenToLogPaid: function() {
        const self = this;
        const promise = typeof self.params.logPaidFilter !== "undefined" ?
            self.params.logPaidFilter.stopWatchingPromise() :
            Promise.resolve();
        return promise
            .then(ThrottledFaucet.deployed)
            .then(instance => {
                const filter = instance.LogPaid({}, {});
                Promise.promisifyAll(filter, {
                    suffix: "Promise"
                });
                self.params.logPaidFilter = filter;
                return filter.watch((error, log) => {
                    self.countDown();
                });
            })
            .catch(error => {
                console.error(error);
                throw error;
            });
    },

    /**
     * @returns {!Promise}
     */
    sendCoin: function() {
        const self = this;
        const recipient = $("#recipient").val();
        console.log("recipient:", recipient);

        $("#btn_send").attr("disabled", true);
        $("#send_tx").html("");
        $("#send_tx_status").textByKey("tx-status-wait");
        $("#send_tx_para").css("visibility", "visible");
        $("#send_tx_error_para").css("visibility", "hidden");
        $("#send_tx_error").html("N/A");
        let instance;
        return ThrottledFaucet.deployed()
            .then(_instance => {
                instance = _instance;
                console.log("is owner:", self.params.owner === window.account);
                if (self.params.owner === window.account && typeof window.account !== "undefined") {
                    return instance.giveTo.call(recipient, {
                            from: window.account
                        })
                        .then(success => {
                            if (!success) {
                                $("#btn_send").attr("disabled", false);
                                $("#send_tx_status").textByKey("tx-status-err1");
                                throw new Error("it will fail anyway");
                            }
                            return instance.giveTo.sendTransaction(recipient, {
                                from: window.account
                            });
                        });
                } else {
                    return self.lambdaGiveTo(recipient);
                }
            })
            .then(txHash => {
                $("#send_tx_status").html("on the way");
                $("#send_tx").html(txHash);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#send_tx").attr("href", self.params.etherscanUrl + "tx/" + txHash);
                } else {
                    $("#send_tx").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return web3.eth.getTransactionReceiptMined(txHash, 5000);
            })
            .then(receipt => {
                if (receipt.logs.length == 0) {
                    $("#btn_send").attr("disabled", false);
                    throw new Error("coin was not sent for internal reasons");
                }
                $("#send_tx_status").html("done");
                return self.refreshBalances();
            })
            .then(() => self.refreshStatics())
            .then(() => self.countDown())
            .catch(error => {
                console.error(error);
                $("#btn_send").attr("disabled", false);
                $("#send_tx_error").text(languageSelection.getTranslatedString("tx-status-err2") + " " + error);
                $("#send_tx_error_para").css("visibility", "visible");
            });
    },

    /**
     * @returns {!Promise} when the count down is finished
     */
    countDown: function() {
        const self = this;
        return ThrottledFaucet.deployed()
            .then(instance => instance.getNextTimestamp())
            .then(nextTimestamp => {
                self.params.nextTimestamp = nextTimestamp;
                if (typeof self.params.intervalTimestamp !== "undefined") {
                    clearInterval(self.params.intervalTimestamp);
                }
                return new Promise((resolve, reject) => {
                    self.params.intervalTimestamp = setInterval(
                        () => {
                            // console.log(self.params.nextTimestamp.toNumber() - new Date().getTime() / 1000);
                            const coolDown = Math.floor(Math.max(0, self.params.nextTimestamp.toNumber() - new Date().getTime() / 1000));
                            $("#coolDown").html(coolDown);
                            if (coolDown == 0) {
                                if (typeof self.params.intervalTimestamp !== "undefined") {
                                    clearInterval(self.params.intervalTimestamp);
                                }
                                $("#btn_send").attr("disabled", false);
                                resolve();
                            }
                        },
                        1000);
                });
            })
            .catch(error => {
                console.error(error);
                $("#coolDown").textByKey("err");
                throw error;
            });
    },

    /**
     * @returns {!Promise.<txHash>}
     */
    lambdaGiveTo: function(who) {
        const self = this;
        return new Promise((resolve, reject) => {
            try {
                $.ajax({
                    contentType: "application/json",
                    data: JSON.stringify({
                        "toWhom": who
                    }),
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.log(jqXHR);
                        reject(new Error(`${textStatus}, ${errorThrown}, ${JSON.stringify(jqXHR.responseJSON)}`));
                    },
                    method: "POST",
                    success: function(data, textStatus, jqXHR) {
                        console.log(data);
                        resolve(data.txHash);
                    },
                    url: faucetUrls[self.params.networkId]
                });
            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * @returns {!Promise}
     */
    donate: function() {
        const self = this;
        const amount = $("#donation").val();

        $("#donate_tx").html("");
        $("#donate_tx_status").textByKey("tx-status-wait");
        $("#donate_tx_para").css("visibility", "visible");
        $("#donate_tx_error_para").css("visibility", "hidden");
        $("#donate_tx_error").html("N/A");
        return ThrottledFaucet.deployed()
            .then(instance => {
                return web3.eth.sendTransactionPromise({
                    from: window.account,
                    to: instance.address,
                    value: web3.toWei(amount),
                    gas: 100000
                });
            })
            .then(txHash => {
                $("#donation").val("");
                $("#donate_tx_status").html("on the way");
                $("#donate_tx").html(txHash);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#donate_tx").attr("href", self.params.etherscanUrl + "tx/" + txHash);
                } else {
                    $("#donate_tx").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return web3.eth.getTransactionReceiptMined(txHash, 5000);
            })
            .then(receipt => {
                if (parseInt(receipt.status) != 1 || receipt.gasUsed == 100000) {
                    throw new Error("donation was not sent for internal reasons");
                }
                $("#donate_tx_status").textByKey("status-done");
                return Promise.delay(5000); // To circumvent a bug where balance is not updated yet
            })
            .then(() => self.refreshBalances())
            .catch(error => {
                console.error(error);
                $("#donate_tx_error").html(languageSelection.getTranslatedString("donate-status-err1") + error);
                $("#donate_tx_error_para").css("visibility", "visible");
            });
    },

    changeGiveAway: function() {
        const self = this;
        const amount = parseFloat($("#give_away_input").val());
        if (isNaN(amount)) {
            console.log("Could not get a number", amount);
            return Promise.reject(new Error("Could not get a number"));
        }
        if (amount > 1) {
            console.log("Too big a giveAway", amount);
            return Promise.reject(new Error("Too big a giveAway"));
        }

        return ThrottledFaucet.deployed()
            .then(instance => instance.setGiveAway(web3.toWei(amount), {
                from: window.account
            }))
            .then(txObj => {
                console.log(txObj);
                return self.refreshStatics();
            })
            .catch(error => {
                console.error(error);
                throw error;
            });
    },
};