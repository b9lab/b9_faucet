const DelayHolder = artifacts.require("./DelayHolderMock.sol");

import { default as Promise } from 'bluebird';

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('DelayHolder', function(accounts) {

    // PREPARATION

    let owner, owner2;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 2, "should have at least 2 accounts");
        owner = accounts[ 0 ];
        owner2 = accounts[ 1 ];
        return web3.eth.makeSureAreUnlocked(
            [ owner, owner2 ])
            .then(() => web3.eth.makeSureHasAtLeast(
                owner, [ owner, owner2 ], web3.toWei(2)))
            .then(web3.eth.getTransactionReceiptMined);
    });

    describe("Deployment", function() {
        it("should deploy a new DelayHolder with 1000", function() {
            return DelayHolder.new(1000, { from: owner })
                .then(_created => _created.getDelay())
                .then(delay =>
                    assert.strictEqual(delay.toNumber(), 1000, "should start with 1000"));
        });

        it("should deploy a new DelayHolder with 2000", function() {
            return DelayHolder.new(2000, { from: owner })
                .then(_created => _created.getDelay())
                .then(delay =>
                    assert.strictEqual(delay.toNumber(), 2000, "should start with 2000"));
        });
    });

    describe("Set delay", function() {
        let created;

        beforeEach("should create a DelayHolder with 1000", function() {
            return DelayHolder.new(1000, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to change delay if you are not the owner", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.setDelay(1001, { from: owner2, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to change delay if you pass value", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.setDelay(1001, { from: owner, value: 1 }));
        });

        it("should not act if same delay", function() {
            return created.setDelay.call(1000, { from: owner })
                .then(success => {
                    assert.isFalse(success, "should not be possible to change to same delay");
                    return created.setDelay(1000, { from: owner });
                })
                .then(txObject =>
                    assert.equal(txObject.logs.length, 0, "should have not created any events"));
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
                        1000,
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

        it("should be possible to change delay twice", function() {
            return created.setDelay(1001, { from: owner })
                // Second change
                .then(txObject => created.setDelay.call(1000, { from: owner }))
                .then(success => {
                    assert.isTrue(success, "should be possible to change delay again");
                    return created.setDelay(1000, { from: owner });
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have had 1 event");
                    assert.strictEqual(
                        txObject.logs[ 0 ].args.oldDelay.toNumber(),
                        1001,
                        "should be the previous value");
                    assert.strictEqual(
                        txObject.logs[ 0 ].args.newDelay.toNumber(),
                        1000,
                        "should be the new value");
                    return created.getDelay();
                })
                .then(delay => assert.strictEqual(
                    delay.toNumber(), 1000, "should be the new value"));
        });
    });

    describe("Monkey Proof", function() {
        var created;

        beforeEach("should create a DelayHolder", function() {
            return DelayHolder.new(1000, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to pass value with getDelay", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.getDelay.sendTransaction({ from: owner, value: 1 }));
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
