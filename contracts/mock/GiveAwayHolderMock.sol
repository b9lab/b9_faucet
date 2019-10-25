pragma solidity 0.4.13;

import "../Owned.sol";
import "../GiveAwayHolder.sol";

/**
 * @notice Provides a way to test `GiveAwayHolder`.
 * @dev Use this in tests only.
 */
contract GiveAwayHolderMock is Owned, GiveAwayHolder {
    function GiveAwayHolderMock(uint _giveAway)
        GiveAwayHolder(_giveAway)
    {
    }
}
