const ThrottledFaucet = artifacts.require("./ThrottledFaucet.sol");
const addEvmFunctions = require("../utils/evmFunctions.js");
const addMinerFunctions = require("../utils/minerFunctions.js");

import { default as Promise } from 'bluebird';
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
Promise.retry = require("bluebird-retry");

addEvmFunctions(web3);
addMinerFunctions(web3);

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}
if (typeof web3.version.getNodePromise !== "function") {
    Promise.promisifyAll(web3.version, { suffix: "Promise" });
}
if (typeof web3.evm.increaseTimePromise !== "function") {
    Promise.promisifyAll(web3.evm, { suffix: "Promise" });
}
if (typeof web3.miner.startPromise !== "function") {
    Promise.promisifyAll(web3.miner, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");
web3.eth.addTransactionToTxObject = require("../utils/addTransactionToTxObject.js");

contract('ThrottledFaucet', function(accounts) {

    // PREPARATION

    let owner, owner2, recipient, isTestRPC, giveCombi = [ 0, 1 ];
    const initialParams = {
        restricted: false,
        giveAway: 1000,
        delay: 60
    };

    /**
     * @param {!Number} timestamp, the timestamp that we want the latest block to get past.
     * @returns {!Promise} yields when a block is past the timestamp.
     */
    function getPastTimestamp(timestamp) {
        return web3.eth.getBlockPromise("latest")
            .then(block => {
                if (isTestRPC) {
                    return web3.evm.increaseTimePromise(timestamp - block.timestamp)
                        .then(() => web3.evm.minePromise());
                } else {
                    // Wait for Geth to have mined a block after the deadline
                    return Promise.delay((timestamp - block.timestamp) * 1000)
                        .then(() => Promise.retry(() => web3.eth.getBlockPromise("latest")
                            .then(block => {
                                if (block.timestamp < timestamp) {
                                    return web3.miner.startPromise(1)
                                        .then(() => { throw new Error("Not ready yet"); });
                                }
                            }),
                            { max_tries: 100, interval: 1000, timeout: 100000 }));
                }
            });
    }

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 4, "should have at least 4 accounts");
        return web3.eth.getCoinbasePromise()
            .then(coinbase => {
                const coinbaseIndex = accounts.indexOf(coinbase);
                // Coinbase gets the rewards, making calculations difficut.
                accounts.splice(coinbaseIndex, 1);
                [owner, owner2, recipient] = accounts;
                giveCombi[ 0 ] = { from: owner2, to: recipient };
                giveCombi[ 1 ] = { from: recipient, to: owner2 };
                return web3.eth.makeSureAreUnlocked([ owner, owner2, recipient ]);
            })
            .then(() => web3.eth.makeSureHasAtLeast(
                owner, [ owner, owner2, recipient ], web3.toWei(2)))
            .then(txObject => web3.eth.getTransactionReceiptMined(txObject));
    });

    before("should identify TestRPC", function() {
        return web3.version.getNodePromise()
            .then(node => isTestRPC = node.indexOf("EthereumJS TestRPC") >= 0);
    });

    describe("Deployment", function() {
        it("should deploy a new ThrottledFaucet with value", function() {
            let created;
            return ThrottledFaucet.new(
                initialParams.restricted, initialParams.giveAway,
                initialParams.delay, { from: owner, value: 1002 })
                .then(_created => {
                    created = _created;
                    return created.isRestricted();
                })
                .then(restricted => {
                    assert.isFalse(restricted, "should start with not restricted");
                    return created.getGiveAway();
                })
                .then(giveAway => {
                    assert.strictEqual(giveAway.toNumber(), 1000, "should start with giveAway of 1000");
                    return created.getDelay();
                })
                .then(delay => {
                    assert.strictEqual(delay.toNumber(), 60, "should start with delay of 3");
                    return web3.eth.getBalancePromise(created.address);
                })
                .then(balance => {
                    assert.strictEqual(balance.toNumber(), 1002, "should be that of the deployment");
                });
        });
    });

    describe("Inheritance", function() {
        let created;

        beforeEach("should create a ThrottledFaucet with value", function() {
            return ThrottledFaucet.new(
                initialParams.restricted, initialParams.giveAway,
                initialParams.delay, { from: owner, value: initialParams.giveAway })
                .then(_created => created = _created);
        });

        describe("Set Owner", function() {
            it("should not be possible to change owner if you are not the owner", function() {
                return web3.eth.expectedExceptionPromise(
                    () => created.setOwner(owner2, { from: owner2, gas: 3000000 }),
                    3000000);
            });

            it("should be possible to change owners", function() {
                return created.setOwner.call(owner2, { from: owner })
                    .then(success => {
                        assert.isTrue(success, "should be possible to change owners");
                        return created.setOwner(owner2, { from: owner });
                    })
                    .then(txObject => {
                        assert.equal(txObject.logs.length, 1, "should have received 1 event");
                        assert.equal(txObject.logs[ 0 ].args.oldOwner, owner, "should be the first account");
                        assert.equal(txObject.logs[ 0 ].args.newOwner, owner2, "should be the second account");
                        // Are previousOwner and newOwner indexed?
                        assert.equal(txObject.receipt.logs[ 0 ].topics.length, 3, "should have 3 topics");
                        assert.equal(
                            web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                            web3.toBigNumber(owner).toString(16),
                            "should be the first account");
                        assert.equal(
                            web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 2 ]).toString(16),
                            web3.toBigNumber(owner2).toString(16),
                            "should be the second account");
                        return created.getOwner();
                    })
                    .then(ownerAddr =>
                        assert.strictEqual(ownerAddr, owner2, "should have registered the changed owner"));
            });
        });

        describe("Set Restricted", function() {
            it("should not be possible to change restricted if you are not the owner", function() {
                return web3.eth.expectedExceptionPromise(
                    () => created.setRestricted(true, { from: owner2, gas: 3000000 }),
                    3000000);
            });

            it("should be possible to change restricted", function() {
                return created.setRestricted.call(true, { from: owner })
                    .then(success => {
                        assert.isTrue(success, "should be possible to change restricted");
                        return created.setRestricted(true, { from: owner });
                    })
                    .then(txObject => {
                        assert.equal(txObject.logs.length, 1, "should have received 1 event");
                        assert.isFalse(txObject.logs[ 0 ].args.oldRestricted, "should be the initial state");
                        assert.isTrue(txObject.logs[ 0 ].args.newRestricted, "should be the new state");
                        // oldRestricted and newRestricted should not be indexed
                        assert.equal(txObject.receipt.logs[ 0 ].topics.length, 1, "should have 1 topic");
                        return created.isRestricted();
                    })
                    .then(restricted => assert.isTrue(restricted, "should have changed the value"));
            });
        });

        describe("Set giveAway", function() {
            it("should not be possible to change giveAway if you are not the owner", function() {
                return web3.eth.expectedExceptionPromise(
                    () => created.setGiveAway(1001, { from: owner2, gas: 3000000 }),
                    3000000);
            });

            it("should be possible to change giveAway", function() {
                return created.setGiveAway.call(1001, { from: owner })
                    .then(success => {
                        assert.isTrue(success, "should be possible to change giveAway");
                        return created.setGiveAway(1001, { from: owner });
                    })
                    .then(txObject => {
                        assert.equal(txObject.logs.length, 1, "should have received 1 event");
                        assert.strictEqual(
                            txObject.logs[ 0 ].args.oldGiveAway.toNumber(),
                            1000,
                            "should be the initial value");
                        assert.strictEqual(
                            txObject.logs[ 0 ].args.newGiveAway.toNumber(),
                            1001,
                            "should be the new value");
                        // oldGiveAway and newGiveAway should not be indexed
                        assert.equal(txObject.receipt.logs[ 0 ].topics.length, 1, "should have 1 topic");
                        return created.getGiveAway();
                    })
                    .then(giveAway => assert.strictEqual(
                        giveAway.toNumber(), 1001, "should be the new value"));
            });
        });

        describe("Set delay", function() {
            it("should not be possible to change delay if you are not the owner", function() {
                return web3.eth.expectedExceptionPromise(
                    () => created.setDelay(1001, { from: owner2, gas: 3000000 }),
                    3000000);
            });

            it("should be possible to change delay", function() {
                return created.setDelay.call(1001, { from: owner })
                    .then(success => {
                        assert.isTrue(success, "should be possible to change delay");
                        return created.setDelay(1001, { from: owner });
                    })
                    .then(txObject => {
                        assert.equal(txObject.logs.length, 1, "should have received 1 event");
                        assert.strictEqual(
                            txObject.logs[ 0 ].args.oldDelay.toNumber(),
                            60,
                            "should be the initial value");
                        assert.strictEqual(
                            txObject.logs[ 0 ].args.newDelay.toNumber(),
                            1001,
                            "should be the new value");
                        // oldDelay and newDelay should not be indexed
                        assert.equal(txObject.receipt.logs[ 0 ].topics.length, 1, "should have 1 topic");
                        return created.getDelay();
                    })
                    .then(delay => assert.strictEqual(
                        delay.toNumber(), 1001, "should be the new value"));
            });
        });

        describe("Set nextTimestamp", function() {
            it("should not be possible to change nextTimestamp", function() {
                assert.strictEqual(
                    typeof created.setNextTimestamp, "undefined",
                    "should not have this method");
            });
        });
    });

    describe("give", function() {
        let created;

        beforeEach("should create a ThrottledFaucet with value", function() {
            return ThrottledFaucet.new(
                initialParams.restricted, initialParams.giveAway,
                initialParams.delay, { from: owner, value: initialParams.giveAway })
                .then(_created => created = _created);
        });

        describe("Unrestricted", function() {
            [ 0, 1 ].forEach(index => {
                let from, to;

                before("should prepare variables", function() {
                    from = giveCombi[ index ].from;
                    to = giveCombi[ index ].to;
                });

                describe("giveTo", function() {
                    it("should giveTo when one asks case " + index, function() {
                        let origBal;
                        return web3.eth.getBalancePromise(to)
                            .then(balance => {
                                origBal = balance;
                                return created.giveTo.call(
                                    to,
                                    { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(success => {
                                assert.isTrue(success, "should accept");
                                return created.giveTo(
                                    to,
                                    { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject => {
                                assert.equal(txObject.logs.length, 1, "should have received 1 event");
                                assert.equal(
                                    txObject.logs[ 0 ].args.who, to,
                                    "should be the recipient");
                                assert.equal(
                                    txObject.logs[ 0 ].args.amount.toNumber(),
                                    initialParams.giveAway,
                                    "should be the giveAway");
                                // Is recipient indexed?
                                assert.equal(txObject.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                                assert.equal(
                                    web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                    web3.toBigNumber(to).toString(16),
                                    "should be the second account");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), initialParams.giveAway / 2,
                                    "should be what was sent along");
                                return web3.eth.getBalancePromise(to);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal.plus(initialParams.giveAway).toString(10),
                                    "should have received giveAway");
                            });
                    });

                    it("should not giveTo when one asks twice too close case " + index, function() {
                        let origBal;
                        return web3.eth.getBalancePromise(to)
                            .then(balance => {
                                origBal = balance;
                                return created.giveTo(to, { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject =>
                                created.giveTo.call(to, { from: from, value: initialParams.giveAway }))
                            .then(success => {
                                assert.isFalse(success, "should not accept");
                                return created.giveTo(to, { from: from, value: initialParams.giveAway });
                            })
                            .then(txObject => {
                                assert.equal(txObject.logs.length, 0, "should not have received any event");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), 3 * initialParams.giveAway / 2,
                                    "should keep what was sent along");
                                return web3.eth.getBalancePromise(to);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal.plus(initialParams.giveAway).toString(10),
                                    "should have received only 1 giveAway");
                            });
                    });

                    it("should giveTo twice when one asks after enough time case " + index, function() {
                        let origBal;
                        return web3.eth.getBalancePromise(to)
                            .then(balance => {
                                origBal = balance;
                                return created.giveTo(to, { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject => created.getNextTimestamp())
                            .then(getPastTimestamp)
                            .then(() => created.giveTo.call(to, { from: from, value: initialParams.giveAway }))
                            .then(success => {
                                assert.isTrue(success, "should accept");
                                return created.giveTo(to, { from: from, value: initialParams.giveAway });
                            })
                            .then(txObject => {
                                assert.equal(txObject.logs.length, 1, "should have received 1 event");
                                assert.equal(txObject.logs[ 0 ].args.who, to, "should be the recipient");
                                assert.equal(
                                    txObject.logs[ 0 ].args.amount.toNumber(),
                                    initialParams.giveAway,
                                    "should be the giveAway");
                                // Is recipient indexed?
                                assert.equal(txObject.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                                assert.equal(
                                    web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                    web3.toBigNumber(to).toString(16),
                                    "should be the second account");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), initialParams.giveAway / 2,
                                    "should keep what was sent along");
                                return web3.eth.getBalancePromise(to);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal.plus(initialParams.giveAway * 2).toString(10),
                                    "should have received 2 giveAways");
                            });
                    });
                });

                describe("giveMe", function() {
                    it("should giveMe when one asks case " + index, function() {
                        let origBal, origBlockNumber, txObject;
                        return web3.eth.getBalancePromise(from)
                            .then(balance => {
                                origBal = balance;
                                return created.giveMe.call(
                                    { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(success => {
                                assert.isTrue(success, "should accept");
                                return created.giveMe(
                                    { from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                            .then(_txObject => {
                                txObject = _txObject;
                                assert.equal(txObject.logs.length, 1, "should have received 1 event");
                                assert.equal(
                                    txObject.logs[ 0 ].args.who, from,
                                    "should be the recipient");
                                assert.equal(
                                    txObject.logs[ 0 ].args.amount.toNumber(),
                                    initialParams.giveAway,
                                    "should be the giveAway");
                                // Is recipient indexed?
                                assert.equal(txObject.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                                assert.equal(
                                    web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                    web3.toBigNumber(from).toString(16),
                                    "should be the from account");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), initialParams.giveAway / 2,
                                    "should be what was sent along");
                                return web3.eth.getBalancePromise(from);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal
                                        .plus(initialParams.giveAway)
                                        .minus(initialParams.giveAway / 2) // Because it was sent along too
                                        .minus(txObject.tx.gasPrice * txObject.receipt.gasUsed)
                                        .toString(10),
                                    "should have received giveAway");
                            });
                    });

                    it("should not giveMe when one asks twice too close case " + index, function() {
                        let origBal, txObject1, txObject2;
                        return web3.eth.getBalancePromise(from)
                            .then(balance => {
                                origBal = balance;
                                return created.giveMe({ from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                            .then(txObject => {
                                txObject1 = txObject;
                                return created.giveMe.call({ from: from, value: initialParams.giveAway });
                            })
                            .then(success => {
                                assert.isFalse(success, "should not accept");
                                return created.giveMe({ from: from, value: initialParams.giveAway });
                            })
                            .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                            .then(txObject => {
                                txObject2 = txObject;
                                assert.equal(txObject2.logs.length, 0, "should not have received any event");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), 3 * initialParams.giveAway / 2,
                                    "should keep what was sent along");

                                return web3.eth.getBalancePromise(from);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal
                                        .plus(initialParams.giveAway)
                                        .minus(initialParams.giveAway / 2) // Because of first tx
                                        .minus(initialParams.giveAway)  // Because of second tx
                                        .minus(txObject1.tx.gasPrice * txObject1.receipt.gasUsed)
                                        .minus(txObject2.tx.gasPrice * txObject2.receipt.gasUsed)
                                        .toString(10),
                                    "should have received only 1 giveAway");
                            });
                    });

                    it("should giveMe twice when one asks after enough time case " + index, function() {
                        let origBal, txObject1, txObject2;
                        return web3.eth.getBalancePromise(from)
                            .then(balance => {
                                origBal = balance;
                                return created.giveMe({ from: from, value: initialParams.giveAway / 2 });
                            })
                            .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                            .then(txObject => {
                                txObject1 = txObject;
                                return created.getNextTimestamp();
                            })
                            .then(getPastTimestamp)
                            .then(() => created.giveMe.call({ from: from, value: initialParams.giveAway }))
                            .then(success => {
                                assert.isTrue(success, "should accept");
                                return created.giveMe({ from: from, value: initialParams.giveAway });
                            })
                            .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                            .then(txObject => {
                                txObject2 = txObject;
                                assert.equal(txObject2.logs.length, 1, "should have received 1 event");
                                assert.equal(txObject2.logs[ 0 ].args.who, from, "should be the recipient");
                                assert.equal(
                                    txObject2.logs[ 0 ].args.amount.toNumber(),
                                    initialParams.giveAway,
                                    "should be the giveAway");
                                // Is recipient indexed?
                                assert.equal(txObject2.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                                assert.equal(
                                    web3.toBigNumber(txObject2.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                    web3.toBigNumber(from).toString(16),
                                    "should be the second account");
                                return web3.eth.getBalancePromise(created.address);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toNumber(), initialParams.giveAway / 2,
                                    "should keep what was sent along");
                                return web3.eth.getBalancePromise(from);
                            })
                            .then(balance => {
                                assert.strictEqual(
                                    balance.toString(10),
                                    origBal
                                        .plus(initialParams.giveAway * 2)
                                        .minus(initialParams.giveAway / 2) // Because of first tx
                                        .minus(initialParams.giveAway)  // Because of second tx
                                        .minus(txObject1.tx.gasPrice * txObject1.receipt.gasUsed)
                                        .minus(txObject2.tx.gasPrice * txObject2.receipt.gasUsed)
                                        .toString(10),
                                    "should have received 2 giveAways");
                            });
                    });
                });
            });
        });

        describe("Restricted", function() {
            beforeEach("should restrict", function() {
                return created.setRestricted(true, { from: owner });
            });

            describe("giveTo", function() {
                it("should giveTo when owner asks", function() {
                    let origBal;
                    return web3.eth.getBalancePromise(owner2)
                        .then(balance => {
                            origBal = balance;
                            return created.giveTo.call(
                                owner2,
                                { from: owner, value: initialParams.giveAway / 2 });
                        })
                        .then(success => {
                            assert.isTrue(success, "should accept");
                            return created.giveTo(
                                owner2,
                                { from: owner, value: initialParams.giveAway / 2 });
                        })
                        .then(txObject => {
                            assert.equal(txObject.logs.length, 1, "should have received 1 event");
                            assert.equal(
                                txObject.logs[ 0 ].args.who, owner2,
                                "should be the recipient");
                            assert.equal(
                                txObject.logs[ 0 ].args.amount.toNumber(),
                                initialParams.giveAway,
                                "should be the giveAway");
                            // Is recipient indexed?
                            assert.equal(txObject.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                            assert.equal(
                                web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                web3.toBigNumber(owner2).toString(16),
                                "should be the second account");
                            return web3.eth.getBalancePromise(created.address);
                        })
                        .then(balance => {
                            assert.strictEqual(
                                balance.toNumber(), initialParams.giveAway / 2,
                                "should be what was sent along");
                            return web3.eth.getBalancePromise(owner2);
                        })
                        .then(balance => {
                            assert.strictEqual(
                                balance.toString(10),
                                origBal.plus(initialParams.giveAway).toString(10),
                                "should have received giveAway");
                        });
                });

                it("should not giveTo when another asks", function() {
                    return web3.eth.expectedExceptionPromise(
                        () => created.giveTo(
                            owner,
                            { from: owner2, gas: 3000000, value: initialParams.giveAway / 2 }),
                        3000000);
                });
            });

            describe("giveMe", function() {
                it("should giveMe when owner asks", function() {
                    let origBal, txObject;
                    return web3.eth.getBalancePromise(owner)
                        .then(balance => {
                            origBal = balance;
                            return created.giveMe.call(
                                { from: owner, value: initialParams.giveAway / 2 });
                        })
                        .then(success => {
                            assert.isTrue(success, "should accept");
                            return created.giveMe(
                                { from: owner, value: initialParams.giveAway / 2 });
                        })
                        .then(txObject => web3.eth.addTransactionToTxObject(txObject))
                        .then(_txObject => {
                            txObject = _txObject;
                            assert.equal(txObject.logs.length, 1, "should have received 1 event");
                            assert.equal(
                                txObject.logs[ 0 ].args.who, owner,
                                "should be the recipient");
                            assert.equal(
                                txObject.logs[ 0 ].args.amount.toNumber(),
                                initialParams.giveAway,
                                "should be the giveAway");
                            // Is recipient indexed?
                            assert.equal(txObject.receipt.logs[ 0 ].topics.length, 2, "should have 2 topics");
                            assert.equal(
                                web3.toBigNumber(txObject.receipt.logs[ 0 ].topics[ 1 ]).toString(16),
                                web3.toBigNumber(owner).toString(16),
                                "should be the second account");
                            return web3.eth.getBalancePromise(created.address);
                        })
                        .then(balance => {
                            assert.strictEqual(
                                balance.toNumber(), initialParams.giveAway / 2,
                                "should be what was sent along");
                            return web3.eth.getBalancePromise(owner);
                        })
                        .then(balance => {
                            assert.strictEqual(
                                balance.toString(10),
                                origBal
                                    .plus(initialParams.giveAway)
                                    .minus(initialParams.giveAway / 2) // Because of first tx
                                    .minus(txObject.tx.gasPrice * txObject.receipt.gasUsed)
                                    .toString(10),
                                "should have received giveAway");
                        });
                });

                it("should not giveMe when another asks", function() {
                    return web3.eth.expectedExceptionPromise(
                        () => created.giveMe(
                            { from: owner2, gas: 3000000, value: initialParams.giveAway / 2 }),
                        3000000);
                });
            });
        });
    });

    describe("Monkey Proof", function() {
        let created;

        beforeEach("should create a ThrottledFaucet", function() {
            return ThrottledFaucet.new(1000, { from: owner })
                .then(_created => created = _created);
        })

        it("should be possible to send ether to it", function() {
            let origBal;
            return web3.eth.getBalancePromise(created.address)
                .then(balance => {
                    origBal = balance;
                    return web3.eth.sendTransactionPromise({
                        from: owner,
                        to: created.address,
                        value: 1
                    });
                })
                .then(txHash => web3.eth.getTransactionReceiptMined(txHash))
                .then(txObject => web3.eth.getBalancePromise(created.address))
                .then(balance => assert.strictEqual(
                    balance.toString(10),
                    origBal.plus(1).toString(10),
                    "should have received the sent wei"));
        });
    });

    describe("Migration", function() {
        it("should start with proper values", function() {
            let deployed;
            return ThrottledFaucet.deployed()
                .then(instance => {
                    deployed = instance;
                    return deployed.getGiveAway();
                })
                .then(giveAway => {
                    assert.strictEqual(
                        giveAway.toString(10),
                        web3.toWei(web3.toBigNumber(1), "ether").toString(10),
                        "should start at 1 Ether");
                    return deployed.getDelay();
                })
                .then(delay => {
                    assert.strictEqual(delay.toNumber(), 60, "should start at 1 minutes");
                    return deployed.isRestricted();
                })
                .then(restricted => {
                    assert.isTrue(restricted, "should start as restricted");
                });
        });
    });
});
