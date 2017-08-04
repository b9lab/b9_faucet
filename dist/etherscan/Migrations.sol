/**
 * Tx: 0xb833cd2b222c61b60f2d8654d088bad9017420bf00ad6220ed0b1812951bc397
 * Address: 0x59396d6323962b6c788ad78ab4164959759645a2
 * Compiler v0.4.11
 * Optimisation Enabled
 */

pragma solidity 0.4.11;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function Migrations() {
    owner = msg.sender;
  }

  function setCompleted(uint completed) restricted {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) restricted {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}
