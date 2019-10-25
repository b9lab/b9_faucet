pragma solidity 0.4.13;

import "./NextTimestampHolderI.sol";

contract NextTimestampHolder is NextTimestampHolderI {
    uint private nextTimestamp;

    function NextTimestampHolder() {
        nextTimestamp = now;
    }

    function getNextTimestamp()
        constant
        returns (uint _nextTimestamp)
    {
        return nextTimestamp;
    }

    function setNextTimestamp(uint newNextTimestamp)
        internal
    {
        nextTimestamp = newNextTimestamp;
    }
}