"use strict";
const BoardController = artifacts.require('./BoardController.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => BoardController.deployed())
    .then(boardController => boardController.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(BoardController.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(BoardController.address, 'BoardController'))
    .then(() => console.log("[Migration] BoardController #initialized"))
};