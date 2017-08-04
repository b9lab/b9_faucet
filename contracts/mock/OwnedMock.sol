pragma solidity 0.4.11;

import "../Owned.sol";

/**
 * @notice Provides a way to test `fromOwner` modifier.
 * @dev Use this in tests only.
 */
contract OwnedMock is Owned {
    /**
     * @notice Increments strictly when the function call passes.
     */
    uint256 public count;

    /**
     * @notice Increments the count, only if you are the owner.
     * @return Whether the action was successful or not.
     */
    function increment() 
        fromOwner 
        returns (bool success)
    {
        count++;
        return true;
    }
}
