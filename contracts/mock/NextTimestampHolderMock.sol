pragma solidity 0.4.13;

import "../Owned.sol";
import "../NextTimestampHolder.sol";

/**
 * @notice Provides a way to test `NextTimestampHolder` and access `setNextTimestamp`.
 * @dev Use this in tests only.
 */
contract NextTimestampHolderMock is Owned, NextTimestampHolder {
    function setNextTimestampOpen(uint newNextTimestamp) {
        setNextTimestamp(newNextTimestamp);
    }
}
