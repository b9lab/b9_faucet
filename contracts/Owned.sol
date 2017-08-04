pragma solidity 0.4.11;

import "./OwnedI.sol";

contract Owned is OwnedI {
    address private owner;

    function Owned() {
        owner = msg.sender;
    }

    function getOwner()
        constant
        returns (address _owner)
    {
        return owner;
    }

    function setOwner(address newOwner) fromOwner 
        returns (bool success)
    {
        if (newOwner == 0) {
            throw;
        }
        address currentOwner = owner;
        if (currentOwner != newOwner) {
            LogOwnerChanged(currentOwner, newOwner);
            owner = newOwner;
            return true;
        }
        return false;
    }
}