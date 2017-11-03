const Restrictable = artifacts.require("./RestrictableMock.sol");

import { default as Promise } from 'bluebird';

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('Restrictable', function(accounts) {

    // PREPARATION

    let owner, owner2;

    before("should prepare accounts", function() {
        let coinbase;
        assert.isAtLeast(accounts.length, 2, "should have at least 2 accounts");
        return web3.eth.getCoinbasePromise()
            .then(_coinbase => {
                coinbase = _coinbase;
                [owner, owner2 ] = accounts;
                return web3.eth.makeSureAreUnlocked([ owner, owner2 ]);
            })
            .then(() => web3.eth.makeSureHasAtLeast(
                coinbase, [ owner, owner2 ], web3.toWei(2)))
            .then(txObject => web3.eth.getTransactionReceiptMined(txObject));
    });

    describe("Deployment", function() {
        it("should deploy a new Restrictable with false", function() {
            return Restrictable.new(false, { from: owner })
                .then(created => created.isRestricted())
                .then(restricted =>
                    assert.isFalse(restricted, "should not start restricted"));
        });

        it("should deploy a new Restrictable with true", function() {
            return Restrictable.new(true, { from: owner })
                .then(created => created.isRestricted())
                .then(restricted =>
                    assert.isTrue(restricted, "should start restricted"));
        });
    });

    describe("Set Restricted", function() {
        let created;

        beforeEach("should create a Restrictable", function() {
            return Restrictable.new(false, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to change restricted if you are not the owner", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.setRestricted(true, { from: owner2, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to change restricted if you pass value", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.setRestricted(true, { from: owner, value: 1 }));
        });

        it("should not act if same restricted", function() {
            return created.setRestricted.call(false, { from: owner })
                .then(success => {
                    assert.isFalse(success, "should not be possible to change to same restricted");
                    return created.setRestricted(false, { from: owner });
                })
                .then(txObject =>
                    assert.equal(txObject.logs.length, 0, "should have not created any events"));
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

        it("should be possible to change restricted twice", function() {
            return created.setRestricted(true, { from: owner })
                // Second change
                .then(txObject => created.setRestricted.call(false, { from: owner }))
                .then(success => {
                    assert.isTrue(success, "should be possible to change restricted again");
                    return created.setRestricted(false, { from: owner });
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have had 1 event");
                    assert.isTrue(txObject.logs[ 0 ].args.oldRestricted, "should be the previous state");
                    assert.isFalse(txObject.logs[ 0 ].args.newRestricted, "should be the new state");
                    return created.isRestricted();
                })
                .then(restricted => assert.isFalse(restricted, "should have changed the value"));
        });
    });

    describe("Use Modifier", function() {
        let created;

        beforeEach("should create a RestrictableMock", function() {
            return Restrictable.new(false, { from: owner })
                .then(_created => created = _created);
        })

        it("should be possible to call increment when not restricted", function() {
            return created.count()
                .then(count => {
                    assert.strictEqual(count.toNumber(), 0, "should never have been called");
                    return created.increment.call({ from: owner });
                })
                .then(success => {
                    assert.isTrue(success, "should be possible to call increment");
                    return created.increment({ from: owner });
                })
                .then(txObject => created.count())
                .then(count => assert.strictEqual(count.toNumber(), 1, "should have been called once"));
        });

        it("should not be possible to call increment when restricted", function() {
            return created.setRestricted(true, { from: owner })
                .then(txObject => web3.eth.expectedExceptionPromise(
                    () => created.increment({ from: owner2, gas: 3000000 }),
                    3000000));
        });
    });

    describe("Monkey Proof", function() {
        let created;

        beforeEach("should create a Restrictable", function() {
            return Restrictable.new(false, { from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to pass value with isRestricted", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.isRestricted.sendTransaction({ from: owner, value: 1 }));
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
