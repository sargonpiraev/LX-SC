"use strict";
const Roles2Library = artifacts.require('./Roles2Library.sol');

const Storage = artifacts.require('./Storage.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = (deployer, network, accounts) => {
    deployer.deploy(Roles2Library, Storage.address, 'Roles2Library')
    .then(() => console.log("[Migration] Roles2Library #deployed"))
};
