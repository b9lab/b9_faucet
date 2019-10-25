pragma solidity 0.4.13;

import "../Owned.sol";
import "../DelayHolder.sol";

/**
 * @notice Provides a way to test `DelayHolder`.
 * @dev Use this in tests only.
 */
contract DelayHolderMock is Owned, DelayHolder {
    function DelayHolderMock(uint _delay)
        DelayHolder(_delay)
    {
    }
}
