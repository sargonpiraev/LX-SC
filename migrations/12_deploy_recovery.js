"use strict";
const Recovery = artifacts.require('./Recovery.sol');

const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.deploy(Recovery, Roles2Library.address)
    .then(() => console.log("[Migration] Recovery #deployed"));
};
