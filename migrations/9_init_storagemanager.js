"use strict";
const StorageManager = artifacts.require('./StorageManager.sol');

const Storage = artifacts.require('./Storage.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(StorageManager.address))
    .then(() => console.log("[Migration] StorageManager #initialized"))
};
