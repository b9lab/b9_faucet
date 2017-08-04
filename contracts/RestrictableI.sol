pragma solidity 0.4.11;

contract RestrictableI {
    event LogRestrictedChanged(bool oldRestricted, bool newRestricted);

    modifier whenNotRestricted {
        if (isRestricted()) {
            throw;
        }
        _;
    }

    function isRestricted()
        constant
        returns (bool _restricted);

    function setRestricted(bool newRestricted)
        returns (bool success);
}