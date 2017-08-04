pragma solidity 0.4.11;

contract GiveAwayHolderI {
    event LogGiveAwayChanged(uint oldGiveAway, uint newGiveAway);

    function getGiveAway()
        constant
        returns (uint _giveAway);

    function setGiveAway(uint newGiveAway)
        returns (bool success);
}