"use strict";
const StorageInterface = artifacts.require('./StorageInterface.sol');

module.exports = deployer => {
    deployer.deploy(StorageInterface)
    .then(() => console.log("[Migration] StorageInterface #deployed"));
};
