"use strict";
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(Storage)
    .then(() => console.log("[Migration] Storage #deployed"))
};
