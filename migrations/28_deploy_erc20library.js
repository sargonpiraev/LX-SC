"use strict";
const ERC20Library = artifacts.require('./ERC20Library.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(ERC20Library, Storage.address, 'ERC20Library', Roles2Library.address)
    .then(() => console.log("[Migration] ERC20Library #deployed"))
};
