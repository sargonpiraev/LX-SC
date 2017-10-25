"use strict";
const ERC20Library = artifacts.require('./ERC20Library.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => ERC20Library.deployed())
    .then(erc20Library => erc20Library.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(ERC20Library.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(ERC20Library.address, 'ERC20Library'))
    .then(() => console.log("[Migration] ERC20Library #initialized"))
};
