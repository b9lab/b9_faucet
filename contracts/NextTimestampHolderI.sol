pragma solidity 0.4.11;

contract NextTimestampHolderI {
    function getNextTimestamp()
        constant
        returns (uint _nextTimestamp);

    function setNextTimestamp(uint newNextTimestamp)
        internal;
}