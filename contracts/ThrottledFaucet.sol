pragma solidity ^0.4.8;

import "./Owned.sol";
import "./Restrictable.sol";
import "./GiveAwayHolder.sol";
import "./DelayHolder.sol";
import "./NextTimestampHolder.sol";
import "./ThrottledFaucetI.sol";

contract ThrottledFaucet is Owned, Restrictable, GiveAwayHolder, DelayHolder, NextTimestampHolder, ThrottledFaucetI {

    function ThrottledFaucet(bool _restricted, uint _giveAway, uint _delay)
        Restrictable(_restricted)
        GiveAwayHolder(_giveAway)
        DelayHolder(_delay)
        payable
    {
    }

    function giveMe() 
        payable
        whenAllowed
        returns (bool success)
    {
        return give(msg.sender);
    }

    function giveTo(address who)
        payable
        whenAllowed
        returns (bool success)
    {
        return give(who);
    }

    function give(address who)
        internal
        returns (bool success)
    {
        if (getNextTimestamp() <= now) {
            // Protect from re-entrance
            setNextTimestamp(now + getDelay());
            uint giveAway = getGiveAway();
            if (who.call.value(giveAway)()) {
                LogPaid(who, giveAway);
                return true;
            }
            setNextTimestamp(now);
        }
        return false;
    }

    function() payable {
    }
}