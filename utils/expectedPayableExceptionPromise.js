/**
 * @param {!Function.<!Promise>} action
 * @returns {!Promise} which throws unless the action yielded "Cannot send value to non-payable function".
 */
module.exports = function expectedPayableExceptionPromise(action) {
    return action()
        .then(
        () => { throw new Error("Should not have reached here"); },
        error => {
            if ((error + "").indexOf("Cannot send value to non-payable function") < 0) {
                throw error;
            }
        });
};