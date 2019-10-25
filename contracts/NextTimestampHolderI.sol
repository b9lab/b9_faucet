pragma solidity 0.4.13;

contract NextTimestampHolderI {
    function getNextTimestamp()
        constant
        returns (uint _nextTimestamp);

    function setNextTimestamp(uint newNextTimestamp)
        internal;
}