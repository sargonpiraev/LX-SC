"use strict";
const BalanceHolder = artifacts.require('./BalanceHolder.sol');

const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.deploy(BalanceHolder, Roles2Library.address)
    .then(() => console.log("[Migration] BalanceHolder #deployed"));
};
