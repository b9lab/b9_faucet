pragma solidity 0.4.11;

contract OwnedI {
    event LogOwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier fromOwner {
        if (msg.sender != getOwner()) {
            throw;
        }
        _;
    }

    function getOwner()
        constant
        returns (address _owner);

    function setOwner(address newOwner)
        returns (bool success);
}