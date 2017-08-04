pragma solidity 0.4.11;

import "../Owned.sol";
import "../Restrictable.sol";

/**
 * @notice Provides a way to test `whenNotRestricted` modifier.
 * @dev Use this in tests only.
 */
contract RestrictableMock is Owned, Restrictable {
    /**
     * @notice Increments strictly when the function call passes.
     */
    uint256 public count;

    function RestrictableMock(bool _restricted)
        Restrictable(_restricted)
    {
    }

    /**
     * @notice Increments the count, only if you are the owner.
     * @return Whether the action was successful or not.
     */
    function increment()
        whenNotRestricted 
        returns (bool success)
    {
        count++;
        return true;
    }
}
