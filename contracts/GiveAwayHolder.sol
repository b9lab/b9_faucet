pragma solidity 0.4.13;

import "./OwnedI.sol";
import "./GiveAwayHolderI.sol";

contract GiveAwayHolder is OwnedI, GiveAwayHolderI {
    uint private giveAway;

    function GiveAwayHolder(uint _giveAway) {
        giveAway = _giveAway;
    }

    function getGiveAway()
        constant
        returns (uint _giveAway)
    {
        return giveAway;
    }

    function setGiveAway(uint newGiveAway)
        fromOwner
        returns (bool success)
    {
        uint currentGiveAway = giveAway;
        if (currentGiveAway != newGiveAway) {
            LogGiveAwayChanged(currentGiveAway, newGiveAway);
            giveAway = newGiveAway;
            return true;
        }
        return false;
    }
}