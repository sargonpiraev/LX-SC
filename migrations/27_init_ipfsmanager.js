"use strict";
const IPFSLibrary = artifacts.require('./IPFSLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => IPFSLibrary.deployed())
    .then(ipfsLibrary => ipfsLibrary.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(IPFSLibrary.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(IPFSLibrary.address, 'IPFSLibrary'))
    .then(() => console.log("[Migration] IPFSLibrary #initialized"))
};
