pragma solidity 0.4.11;

import "./OwnedI.sol";
import "./RestrictableI.sol";

contract Restrictable is OwnedI, RestrictableI {
    bool private restricted;

    function Restrictable(bool _restricted) {
        restricted = _restricted;
    }

    function isRestricted()
        constant
        returns (bool _restricted)
    {
        return restricted;
    }

    function setRestricted(bool newRestricted) fromOwner 
        returns (bool success)
    {
        bool currentRestricted = restricted;
        if (newRestricted != currentRestricted) {
            LogRestrictedChanged(restricted, newRestricted);
            restricted = newRestricted;
            return true;
        }
        return false;
    }
}