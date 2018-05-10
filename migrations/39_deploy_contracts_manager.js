"use strict";
const ContractsManager = artifacts.require('./ContractsManager.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(ContractsManager, Storage.address, 'ContractsManager', Roles2Library.address)
    .then(() => console.log("[Migration] ContractsManager #deployed"))
};
