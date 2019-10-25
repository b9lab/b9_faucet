pragma solidity 0.4.13;

contract OwnedI {
    event LogOwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier fromOwner {
        require(msg.sender == getOwner());
        _;
    }

    function getOwner()
        constant
        returns (address _owner);

    function setOwner(address newOwner)
        returns (bool success);
}