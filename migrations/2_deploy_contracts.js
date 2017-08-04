const ThrottledFaucet = artifacts.require("./ThrottledFaucet.sol");

module.exports = function(deployer, network, accounts) {

    const desiredRestricted = true;
    const desiredGiveAway = web3.toWei(web3.toBigNumber(1), "ether");
    const desiredDelay = 60; // seconds
    let ownerAddress = accounts[0];

    if (network == "ropsten") {
        ownerAddress = "0xb436ba50d378d4bbc8660d312a13df6af6e89dfb";
    }

    deployer.deploy(ThrottledFaucet,
        desiredRestricted,
        desiredGiveAway,
        desiredDelay,
        { from: ownerAddress, value: desiredGiveAway.times(5), gas: 1000000 });

};
