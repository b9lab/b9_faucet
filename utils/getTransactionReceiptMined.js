const sequentialPromise = require("./sequentialPromise.js");

/**
 * @param {!string | !Array.<!string>} txHash, a transaction hash or an array of transaction hashes.
 * @param {Number} interval, in milliseconds.
 * @returns {!Promise.<!object> | !Promise.<!Array.<!object>>} the receipt or an array of receipts.
 */
module.exports = function getTransactionReceiptMined(txHash, interval) {
    const self = this;
    const transactionReceiptAsync = function(resolve, reject) {
        self.getTransactionReceipt(txHash, (error, receipt) => {
            if (error) {
                reject(error);
            } else if (receipt == null) {
                setTimeout(
                    () => transactionReceiptAsync(resolve, reject),
                    interval ? interval : 500);
            } else {
                resolve(receipt);
            }
        });
    };
    if (Array.isArray(txHash)) {
        return sequentialPromise(txHash.map(
            oneTxHash => () => self.getTransactionReceiptMined(oneTxHash, interval)));
    } else if (typeof txHash === "string") {
        return new Promise(transactionReceiptAsync);
    } else {
        throw new Error("Invalid Type: " + txHash);
    }
};