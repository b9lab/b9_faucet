// Import libraries we need.
import {
    default as BigNumber
} from 'bignumber.js';
import {
    default as Web3
} from 'web3';
import {
    default as contract
} from 'truffle-contract'
import {
    default as Promise
} from 'bluebird';
import {
    default as $
} from 'jquery';

// Import our contract artifacts and turn them into usable abstractions.
import throttledFaucetArtifacts from '../../build/contracts/ThrottledFaucet.json'

// ThrottledFaucet is our usable abstraction, which we'll use through the code below.
const ThrottledFaucet = contract(throttledFaucetArtifacts);
window.ThrottledFaucet = ThrottledFaucet;

// Declare the possible web3 providers
const rpcEndPoints = [
    "http://localhost:8545",
    "http://geth.b9lab.com:8549",
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

window.addEventListener('load', function() {
    window.App.start();
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
        this.initUI();
        return App.findBestWeb3()
            .then(web3Instance => {
                $("#web3_off").css({
                    display: "none"
                });
                $("#web3_on").css({
                    display: "block"
                });
                ThrottledFaucet.setProvider(web3.currentProvider);

                // Get the initial account balance so it can be displayed.
                return window.web3.eth.getAccountsPromise();
            })
            .then(accs => {
                if (accs.length == 0) {
                    window.account = undefined;
                    console.log("No account found");
                } else {
                    window.account = accs[0];
                    $("#title_your_balance").css({
                        display: "block"
                    });
                    $("#your_address").html(window.account);
                    if (typeof self.params.etherscanUrl !== "undefined") {
                        $("#your_address").attr("href", self.params.etherscanUrl + "address/" + window.account);
                    } else {
                        $("#your_address").attr("title", languageSelection.getTranslatedString("err-1"));
                    }
                    $("#recipient").val(window.account);
                    $("#donate_area").css({
                        display: "block"
                    });
                }
                return self.refreshBalances();
            })
            .then(() => self.refreshStatics()) // We need this syntax for `this` to be correct
            .then(() => self.listenToLogPaid())
            .then(() => self.countDown())
            .catch(console.error);
    },

    /**
     * @returns {!Promise}
     */
    initUI: function() {
        $(document).prop('title', languageSelection.getTranslatedString("page-title"));
        $("#academy-link").text(languageSelection.getTranslatedString("academy-link"));
        $("#web3_status").text(languageSelection.getTranslatedString("status-connecting"));
        $("#give-away-title").text(languageSelection.getTranslatedString("withdraw-giveaway"));
        $("#wait-title").text(languageSelection.getTranslatedString("withdraw-wait"));
        $("#coolDown").text(languageSelection.getTranslatedString("status-loading"));
        $("#title, #title_deleted").text(languageSelection.getTranslatedString("title"));
        $("#your_address, #your_balance, #faucet_balance, #address, #owner").text(languageSelection.getTranslatedString("status-loading"));
        $("#withdraw-title").text(languageSelection.getTranslatedString("withdraw-title"));
        $("#btn-change").text(languageSelection.getTranslatedString("withdraw-button2"));
        $("#btn_send").text(languageSelection.getTranslatedString("withdraw-button1"));
        $(".seconds").text(languageSelection.getTranslatedString("seconds"));
        $(".err").text(languageSelection.getTranslatedString("err"));
        $("#donate-title").text(languageSelection.getTranslatedString("donate-title"));
        $("#donate-tx").text(languageSelection.getTranslatedString("tx"));
        $("#info-balance").text(languageSelection.getTranslatedString("info-header"));
        $("#info-address").text(languageSelection.getTranslatedString("info-address"));
        $("#info-owner").text(languageSelection.getTranslatedString("info-owner"));
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
                $("#web3_status").html(languageSelection.getTranslatedString("err-3"));
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
            .then(() => ThrottledFaucet.deployed())
            .then(instance => {
                $("#title_deleted").css({
                    display: "none"
                });
                $("#title").css({
                    display: "inline"
                });
                $("#faucet_area").css({
                    display: "block"
                });
                $("#address").html(instance.address);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#address").attr("href", self.params.etherscanUrl + "address/" + instance.address);
                } else {
                    $("#address").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return instance.getOwner()
                    .catch(error => {
                        console.error(error);
                        $("#owner").html(languageSelection.getTranslatedString("err"));
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
                        console.log(owner, window.account, owner == window.account);
                        if (owner == window.account) {
                            $(".owner-only").css({
                                display: "inline-block"
                            });
                        }
                        return instance.getGiveAway();
                    })
                    .catch(error => {
                        console.error(error);
                        $("#give_away").html(languageSelection.getTranslatedString("err"));
                        throw error;
                    })
                    .then(giveAway => {
                        $("#give_away").html(self.fromWei(giveAway).toString(10));
                    });
            });
    },

    /**
     * @returns {!Promise}
     */
    refreshBalances: function() {
        const self = this;
        let promise;
        if (typeof window.account !== "undefined") {
            console.log("has account");
            promise = web3.eth.getBalancePromise(window.account)
                .then(balance => {
                    console.log(balance);
                    $("#your_balance").html(self.fromWei(balance).toString(10));
                })
                .catch(error => {
                    console.error(error);
                    $("#your_balance").html(languageSelection.getTranslatedString("err"));
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
                $("#faucet_balance").html(languageSelection.getTranslatedString("err"));
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
        console.log("recipient", recipient);

        $("#btn_send").attr("disabled", true);
        $("#send_tx").html("");
        $("#send_tx_status").html(languageSelection.getTranslatedString("tx-status-wait"));
        $("#send_tx_para").css("visibility", "visible");
        $("#send_tx_error_para").css("visibility", "hidden");
        $("#send_tx_error").html("N/A");
        let instance;
        return ThrottledFaucet.deployed()
            .then(_instance => {
                instance = _instance;
                console.log(self.params.owner === window.account);
                if (self.params.owner === window.account && typeof window.account !== "undefined") {
                    return instance.giveTo.call(recipient, {
                            from: window.account
                        })
                        .then(success => {
                            if (!success) {
                                $("#btn_send").attr("disabled", false);
                                $("#send_tx_status").html(languageSelection.getTranslatedString("tx-status-err1"));
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
            .then(function(txHash) {
                $("#send_tx_status").html("on the way");
                $("#send_tx").html(txHash);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#send_tx").attr("href", self.params.etherscanUrl + "tx/" + txHash);
                } else {
                    $("#send_tx").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return web3.eth.getTransactionReceiptMined(txHash);
            })
            .then(function(receipt) {
                if (receipt.logs.length == 0) {
                    $("#btn_send").attr("disabled", false);
                    throw new Error("coin was not sent for internal reasons");
                }
                $("#send_tx_status").html("done");
                return self.refreshBalances();
            })
            .then(() => self.refreshStatics())
            .then(() => self.countDown())
            .catch(function(error) {
                console.error(error);
                $("#btn_send").attr("disabled", false);
                $("#send_tx_error").html(languageSelection.getTranslatedString("tx-status-err2") + " " + error);
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
                $("#coolDown").html(languageSelection.getTranslatedString("err"));
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
        $("#donate_tx_status").html(languageSelection.getTranslatedString("tx-status-wait"));
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
            .then(function(txHash) {
                $("#donation").val("");
                $("#donate_tx_status").html("on the way");
                $("#donate_tx").html(txHash);
                if (typeof self.params.etherscanUrl !== "undefined") {
                    $("#donate_tx").attr("href", self.params.etherscanUrl + "tx/" + txHash);
                } else {
                    $("#donate_tx").attr("title", languageSelection.getTranslatedString("err-1"));
                }
                return web3.eth.getTransactionReceiptMined(txHash);
            })
            .then(function(receipt) {
                if (receipt.gasUsed == 100000) {
                    throw new Error("donation was not sent for internal reasons");
                }
                $("#donate_tx_status").html(languageSelection.getTranslatedString("status-done"));
                return Promise.delay(5000); // To circumvent a bug where balance is not updated yet
            })
            .then(() => self.refreshBalances())
            .catch(function(error) {
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
            })
    },
};