"use strict";
const FakeERC20Token = artifacts.require('./FakeERC20Token.sol');

module.exports = (deployer, network) => {
    if (network === "ntr1x") {
        deployer.deploy(FakeERC20Token)
        .then(() => console.log("[Migration] FakeERC20Token #deployed"));
    }
};
