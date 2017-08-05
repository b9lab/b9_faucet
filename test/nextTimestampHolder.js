const NextTimestampHolder = artifacts.require("./NextTimestampHolderMock.sol");

import { default as Promise } from 'bluebird';
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('NextTimestampHolder', function(accounts) {

    // PREPARATION

    let owner;

    before("should prepare accounts", function() {
        assert.isAtLeast(accounts.length, 1, "should have at least 1 account");
        owner = accounts[ 0 ];
        return web3.eth.makeSureAreUnlocked(
            [ owner ])
            .then(() => web3.eth.makeSureHasAtLeast(
                owner, [ owner ], web3.toWei(2)))
            .then(web3.eth.getTransactionReceiptMined);
    });

    describe("Deployment", function() {
        it("should deploy a new NextTimestampHolder", function() {
            let created;
            return NextTimestampHolder.new({ from: owner })
                .then(_created => {
                    created = _created;
                    return web3.eth.getTransactionReceipt(created.transactionHash);
                })
                .then(receipt => Promise.allNamed({
                    block: () => web3.eth.getBlockPromise(receipt.blockNumber),
                    timestamp: () => created.getNextTimestamp()
                }))
                .then(info => {
                    assert.strictEqual(
                        info.block.timestamp, info.timestamp.toNumber(),
                        "should be timestamp of creation");
                });
        });
    });

    describe("Set nextTimestamp", function() {
        let created;

        beforeEach("should create a NextTimestampHolder", function() {
            return NextTimestampHolder.new({ from: owner })
                .then(_created => created = _created);
        })

        it("should be possible to change nextTimestamp", function() {
            return created.setNextTimestampOpen(1001, { from: owner })
                .then(txObject => created.getNextTimestamp())
                .then(nextTimestamp => assert.strictEqual(
                    nextTimestamp.toNumber(), 1001, "should be the new value"));
        });

        it("should be possible to change nextTimestamp twice", function() {
            return created.setNextTimestampOpen(1001, { from: owner })
                // Second change
                .then(txObject => created.setNextTimestampOpen(1002, { from: owner }))
                .then(txObject => created.getNextTimestamp())
                .then(nextTimestamp => assert.strictEqual(
                    nextTimestamp.toNumber(), 1002, "should be the new value"));
        });
    });

    describe("Monkey Proof", function() {
        let created;

        beforeEach("should create a NextTimestampHolder", function() {
            return NextTimestampHolder.new({ from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to pass value with getNextTimestamp", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.getNextTimestamp.sendTransaction({ from: owner, value: 1 }));
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
