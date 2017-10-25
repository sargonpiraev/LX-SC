"use strict";
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = (deployer, network, accounts) => {
    let roles2Library;

    deployer
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.setupEventsHistory(MultiEventsHistory.address))

    .then(() => Roles2Library.deployed())
    .then(_roles2Library => roles2Library = _roles2Library)
    .then(() => roles2Library.setupEventsHistory(MultiEventsHistory.address))

    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(Roles2Library.address, 'Roles2Library'))
    .then(() => roles2Library.isUserRoot.call(accounts[0]))
    .then(() => roles2Library.setRootUser(accounts[0], true))

    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(StorageManager.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(Roles2Library.address))

    .then(() => console.log("[Migration] Roles2Library #initialized"))
};
