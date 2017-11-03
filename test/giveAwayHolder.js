const GiveAwayHolder = artifacts.require("./GiveAwayHolderMock.sol");

import { default as Promise } from 'bluebird';

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('GiveAwayHolder', function(accounts) {

    // PREPARATION

    let owner, owner2;

    before("should prepare accounts", function() {
        let coinbase;
        assert.isAtLeast(accounts.length, 2, "should have at least 2 accounts");
        return web3.eth.getCoinbasePromise()
            .then(_coinbase => {
                coinbase = _coinbase;
                [ owner, owner2 ] = accounts;
                return web3.eth.makeSureAreUnlocked([ owner, owner2 ]);
            })
            .then(() => web3.eth.makeSureHasAtLeast(
                coinbase, [ owner, owner2 ], web3.toWei(2)))
            .then(txObject => web3.eth.getTransactionReceiptMined(txObject));
    });

    describe("Deployment", function() {
        it("should deploy a new GiveAwayHolder with 1000", function() {
            return GiveAwayHolder.new(1000, { from: owner })
                .then(created => created.getGiveAway())
                .then(giveAway =>
                    assert.strictEqual(giveAway.toNumber(), 1000, "should start with 1000"));
        });

        it("should deploy a new GiveAwayHolder with 2000", function() {
            return GiveAwayHolder.new(2000, { from: owner })
                .then(created => created.getGiveAway())
                .then(giveAway =>
                    assert.strictEqual(giveAway.toNumber(), 2000, "should start with 2000"));
        });
    });

    describe("Set giveAway", function() {
        let created;

        beforeEach("should create a GiveAwayHolder with 1000", function() {
            return GiveAwayHolder.new(1000, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to change giveAway if you are not the owner", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.setGiveAway(1001, { from: owner2, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to change giveAway if you pass value", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.setGiveAway(1001, { from: owner, value: 1 }));
        });

        it("should not act if same giveAway", function() {
            return created.setGiveAway.call(1000, { from: owner })
                .then(success => {
                    assert.isFalse(success, "should not be possible to change to same giveAway");
                    return created.setGiveAway(1000, { from: owner });
                })
                .then(txObject =>
                    assert.equal(txObject.logs.length, 0, "should have not created any events"));
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

        it("should be possible to change giveAway twice", function() {
            return created.setGiveAway(1001, { from: owner })
                // Second change
                .then(txObject => created.setGiveAway.call(1000, { from: owner }))
                .then(success => {
                    assert.isTrue(success, "should be possible to change giveAway again");
                    return created.setGiveAway(1000, { from: owner });
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have had 1 event");
                    assert.strictEqual(
                        txObject.logs[ 0 ].args.oldGiveAway.toNumber(),
                        1001,
                        "should be the previous value");
                    assert.strictEqual(
                        txObject.logs[ 0 ].args.newGiveAway.toNumber(),
                        1000,
                        "should be the new value");
                    return created.getGiveAway();
                })
                .then(giveAway => assert.strictEqual(
                    giveAway.toNumber(), 1000, "should be the new value"));
        });
    });

    describe("Monkey Proof", function() {
        let created;

        beforeEach("should create a GiveAwayHolder", function() {
            return GiveAwayHolder.new(1000, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to pass value with getGiveAway", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.getGiveAway.sendTransaction({ from: owner, value: 1 }));
        });

        it("should not be possible to send ether to it", function() {
            return web3.eth.expectedExceptionPromise(
                () => web3.eth.sendTransactionPromise({
                    from: owner,
                    to: created.address,
                    value: 1,
                    gas: 3000000
                }),
                3000000);
        });
    });
});
