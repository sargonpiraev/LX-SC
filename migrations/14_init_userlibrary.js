"use strict";
const UserLibrary = artifacts.require('./UserLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => UserLibrary.deployed())
    .then(userLibrary => userLibrary.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(UserLibrary.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(UserLibrary.address, 'UserLibrary'))
    .then(() => console.log("[Migration] UserLibrary #initialized"))
};
