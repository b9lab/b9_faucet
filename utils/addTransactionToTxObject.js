const sequentialPromiseNamed = require("./sequentialPromiseNamed.js");

/**
 * @param {!object} txObject, a transaction object as returned by truffle-contract.
 * @returns {!Promise.<!object>} the same transaction object when the full transaction has replaced the hash.
 */
module.exports = function addTransactionToTxObject(txObject) {
    const self = this;
    return sequentialPromiseNamed({
        tx: () => self.getTransactionPromise(txObject.tx),
        receipt: () => txObject.receipt,
        logs: () => txObject.logs
    });
};