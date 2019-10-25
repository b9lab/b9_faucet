pragma solidity 0.4.13;

import "./OwnedI.sol";
import "./DelayHolderI.sol";

contract DelayHolder is OwnedI, DelayHolderI {
    uint private delay;

    function DelayHolder(uint _delay) {
        delay = _delay;
    }

    function getDelay()
        constant
        returns (uint _delay)
    {
        return delay;
    }

    function setDelay(uint newDelay)
        fromOwner
        returns (bool success)
    {
        uint currentDelay = delay;
        if (currentDelay != newDelay) {
            LogDelayChanged(currentDelay, newDelay);
            delay = newDelay;
            return true;
        }
        return false;
    }
}