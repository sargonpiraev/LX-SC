"use strict";
const SkillsLibrary = artifacts.require('./SkillsLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    deployer
    .then(() => SkillsLibrary.deployed())
    .then(skillsLibrary => skillsLibrary.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(SkillsLibrary.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(SkillsLibrary.address, 'SkillsLibrary'))
    .then(() => console.log("[Migration] SkillsLibrary #initialized"))
};
