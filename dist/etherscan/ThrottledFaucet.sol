/**
 * Tx: 0x5a594c62a9c36d78fba5af19f0c2d464d78289fba7e5a31d5473daba35ba5b73
 * Address: 0x3b873a919aa0512d5a0f09e6dcceaa4a6727fafe
 * Compiler v0.4.11
 * Optimisation Enabled
 * Constructor parameter: 00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000003c
 */

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

contract DelayHolderI {
    event LogDelayChanged(uint oldDelay, uint newDelay);

    function getDelay()
        constant
        returns (uint _delay);

    function setDelay(uint newDelay)
        returns (bool success);
}

contract DelayHolder is OwnedI, DelayHolderI {
    uint private delay;

    function DelayHolder(uint _delay) {
        delay = _delay;
    }

    function getDelay()
        constant
        returns (uint _delay) {
        return delay;
    }

    function setDelay(uint newDelay)
        fromOwner
        returns (bool success) {
        uint currentDelay = delay;
        if (currentDelay != newDelay) {
            LogDelayChanged(currentDelay, newDelay);
            delay = newDelay;
            return true;
        }
        return false;
    }
}

contract GiveAwayHolderI {
    event LogGiveAwayChanged(uint oldGiveAway, uint newGiveAway);

    function getGiveAway()
        constant
        returns (uint _giveAway);

    function setGiveAway(uint newGiveAway)
        returns (bool success);
}

contract GiveAwayHolder is OwnedI, GiveAwayHolderI {
    uint private giveAway;

    function GiveAwayHolder(uint _giveAway) {
        giveAway = _giveAway;
    }

    function getGiveAway()
        constant
        returns (uint _giveAway) {
        return giveAway;
    }

    function setGiveAway(uint newGiveAway)
        fromOwner
        returns (bool success) {
        uint currentGiveAway = giveAway;
        if (currentGiveAway != newGiveAway) {
            LogGiveAwayChanged(currentGiveAway, newGiveAway);
            giveAway = newGiveAway;
            return true;
        }
        return false;
    }
}

contract NextTimestampHolderI {
    function getNextTimestamp()
        constant
        returns (uint _nextTimestamp);

    function setNextTimestamp(uint newNextTimestamp)
        internal;
}

contract NextTimestampHolder is NextTimestampHolderI {
    uint private nextTimestamp;

    function NextTimestampHolder() {
        nextTimestamp = now;
    }

    function getNextTimestamp()
        constant
        returns (uint _nextTimestamp) {
        return nextTimestamp;
    }

    function setNextTimestamp(uint newNextTimestamp)
        internal {
        nextTimestamp = newNextTimestamp;
    }
}

contract Owned is OwnedI {
    address private owner;

    function Owned() {
        owner = msg.sender;
    }

    function getOwner()
        constant
        returns (address _owner) {
        return owner;
    }

    function setOwner(address newOwner) fromOwner 
        returns (bool success) {
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

contract Restrictable is OwnedI, RestrictableI {
    bool private restricted;

    function Restrictable(bool _restricted) {
        restricted = _restricted;
    }

    function isRestricted()
        constant
        returns (bool _restricted) {
        return restricted;
    }

    function setRestricted(bool newRestricted) fromOwner 
        returns (bool success) {
        bool currentRestricted = restricted;
        if (newRestricted != currentRestricted) {
            LogRestrictedChanged(restricted, newRestricted);
            restricted = newRestricted;
            return true;
        }
        return false;
    }
}

contract ThrottledFaucetI is OwnedI, RestrictableI, GiveAwayHolderI, DelayHolderI, NextTimestampHolderI {
    event LogPaid(address indexed who, uint amount);

    modifier whenAllowed {
        if (isRestricted() && msg.sender != getOwner()) {
            throw;
        }
        _;
    }

    function giveMe() 
        payable
        returns (bool success);

    function giveTo(address who)
        payable
        returns (bool success);

    function give(address who)
        internal
        returns (bool success);
}

contract ThrottledFaucet is Owned, Restrictable, GiveAwayHolder, DelayHolder, NextTimestampHolder, ThrottledFaucetI {

    function ThrottledFaucet(bool _restricted, uint _giveAway, uint _delay)
        Restrictable(_restricted)
        GiveAwayHolder(_giveAway)
        DelayHolder(_delay)
        payable {
    }

    function giveMe() 
        payable
        whenAllowed
        returns (bool success) {
        return give(msg.sender);
    }

    function giveTo(address who)
        payable
        whenAllowed
        returns (bool success) {
        return give(who);
    }

    function give(address who)
        internal
        returns (bool success) {
        if (getNextTimestamp() <= now) {
            // Protect from re-entrance
            setNextTimestamp(now + getDelay());
            uint giveAway = getGiveAway();
            if (who.call.value(giveAway)()) {
                LogPaid(who, giveAway);
                return true;
            }
            setNextTimestamp(now);
        }
        return false;
    }
}
