pragma solidity 0.4.13;

import "./OwnedI.sol";
import "./RestrictableI.sol";
import "./GiveAwayHolderI.sol";
import "./DelayHolderI.sol";
import "./NextTimestampHolderI.sol";

contract ThrottledFaucetI is OwnedI, RestrictableI, GiveAwayHolderI, DelayHolderI, NextTimestampHolderI {
    event LogPaid(address indexed who, uint amount);

    modifier whenAllowed {
        require(!isRestricted() || msg.sender == getOwner());
        _;
    }

    function giveMe() 
        payable
        returns (bool success);

    function giveTo(address who)
        payable
        returns (bool success);

    function give(address who)
        internal
        returns (bool success);
}