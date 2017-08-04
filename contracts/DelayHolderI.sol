pragma solidity 0.4.11;

contract DelayHolderI {
    event LogDelayChanged(uint oldDelay, uint newDelay);

    function getDelay()
        constant
        returns (uint _delay);

    function setDelay(uint newDelay)
        returns (bool success);

}