pragma solidity 0.4.13;

contract RestrictableI {
    event LogRestrictedChanged(bool oldRestricted, bool newRestricted);

    modifier whenNotRestricted {
        require(!isRestricted());
        _;
    }

    function isRestricted()
        constant
        returns (bool _restricted);

    function setRestricted(bool newRestricted)
        returns (bool success);
}