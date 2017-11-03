"use strict";

/**
 * @param {!Function.<!Promise>} actionPromise.
 * @param {!Number | !string | !BigNumber} gasToUse.
 * @param {Number} timeOut.
 * @returns {!Promise} which throws unless it hit a valid error.
 */
module.exports = function expectedExceptionPromise(actionPromise, gasToUse, timeOut) {
    const self = this;
    timeOut = timeOut ? timeOut : 5000;
    return actionPromise()
        .then(function(txObject) {
            if (typeof txObject === "string") {
                return self.getTransactionReceiptMined(txObject);
            } else if (typeof txObject.receipt === "object") {
                return txObject.receipt;
            }
            throw new Error("Invalid object", txObject);
        })
        .then(function(receipt) {
            // We are in Geth
            if (typeof receipt.status !== "undefined") {
                // Byzantium
                assert.strictEqual(receipt.status, "0x0", "should have reverted");
            } else {
                // Pre Byzantium
                assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
            }
        })
        .catch(function(e) {
            if (e.message.indexOf("invalid opcode") > -1 ||
                e.message.indexOf("invalid JUMP") > -1 ||
                e.message.indexOf("out of gas") > -1) {
                // We are in TestRPC
            } else if (e.message.indexOf("please check your gas amount") > -1) {
                // We are in Geth for a deployment
            } else {
                throw e;
            }
        });
};