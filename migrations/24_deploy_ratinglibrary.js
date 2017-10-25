"use strict";
const RatingsAndReputationLibrary = artifacts.require('./RatingsAndReputationLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(RatingsAndReputationLibrary, Storage.address, 'RatingsAndReputationLibrary', Roles2Library.address)
    .then(() => console.log("[Migration] RatingsAndReputationLibrary #deployed"))
};
