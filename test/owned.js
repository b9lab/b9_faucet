const Owned = artifacts.require("./Owned.sol");
const OwnedMock = artifacts.require("./OwnedMock.sol");

import { default as Promise } from 'bluebird';

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
web3.eth.expectedPayableExceptionPromise = require("../utils/expectedPayableExceptionPromise.js");
web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");

contract('Owned', function(accounts) {

    // PREPARATION

    let owner, owner2, owner3;

    before("should prepare accounts", function() {
        let coinbase;
        assert.isAtLeast(accounts.length, 3, "should have at least 3 accounts");
        return web3.eth.getCoinbasePromise()
            .then(_coinbase => {
                coinbase = _coinbase;
                [owner, owner2, owner3 ] = accounts;
                return web3.eth.makeSureAreUnlocked([ owner, owner2 ]);
            })
            .then(() => web3.eth.makeSureHasAtLeast(
                coinbase, [ owner, owner2 ], web3.toWei(2)))
            .then(txObject => web3.eth.getTransactionReceiptMined(txObject));
    });

    describe("Deployment", function() {
        it("should deploy a new Owned with no value", function() {
            return Owned.new({ from: owner })
                .then(created => created.getOwner())
                .then(ownerAddr =>
                    assert.strictEqual(ownerAddr, owner, "should have registered the owner"));
        });
    });

    describe("Set Owner", function() {
        let created;

        beforeEach("should create an Owned", function() {
            return Owned.new({ from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to change owner if you are not the owner", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.setOwner(owner2, { from: owner2, gas: 3000000 }),
                3000000);
        });

        it("should not be possible to change owner if you pass value", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.setOwner(owner2, { from: owner, value: 1 }));
        });

        it("should not be possible to change owner to a 0 address", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.setOwner(0, { from: owner, gas: 3000000 }),
                3000000);
        });

        it("should not act if same owner", function() {
            return created.setOwner.call(owner, { from: owner })
                .then(success => {
                    assert.isFalse(success, "should not be possible to change to same owner");
                    return created.setOwner(owner, { from: owner });
                })
                .then(txObject =>
                    assert.equal(txObject.logs.length, 0, "should have not created any events"));
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

        it("should be possible to change owners twice", function() {
            return created.setOwner(owner2, { from: owner })
                // Second change
                .then(txObject => created.setOwner.call(owner3, { from: owner2 }))
                .then(success => {
                    assert.isTrue(success, "should be possible to change owner again");
                    return created.setOwner(owner3, { from: owner2 });
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have had 1 event");
                    assert.equal(txObject.logs[ 0 ].args.oldOwner, owner2, "should be the second account");
                    assert.equal(txObject.logs[ 0 ].args.newOwner, owner3, "should be the third account");
                    return created.getOwner();
                })
                .then(ownerAddr =>
                    assert.strictEqual(ownerAddr, owner3, "should have registered the changed owner"));
        });
    });

    describe("Use Modifier", function() {
        let created;

        beforeEach("should create an Owned", function() {
            return OwnedMock.new({ from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to call increment when not owner", function() {
            return web3.eth.expectedExceptionPromise(
                () => created.increment({ from: owner2, gas: 3000000 }),
                3000000);
        });

        it("should be possible to call increment when owner", function() {
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
    });

    describe("Monkey Proof", function() {
        let created;

        beforeEach("should create an Owned", function() {
            return Owned.new({ from: owner })
                .then(_created => created = _created);
        })

        it("should not be possible to pass value with getOwner", function() {
            return web3.eth.expectedPayableExceptionPromise(
                () => created.getOwner.sendTransaction({ from: owner, value: 1 }));
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
