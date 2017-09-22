"use strict";
const RatingsAndReputationLibrary = artifacts.require('./RatingsAndReputationLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    let rolesLibrary;
    let ratingsAndReputationLibrary;
    const RolesLibraryEvaluatorRole = 22;

    deployer
    .then(() => Roles2Library.deployed())
    .then(_roles2Library => rolesLibrary = _roles2Library)
    .then(() => RatingsAndReputationLibrary.deployed())
    .then(_ratingsAndReputationLibrary => ratingsAndReputationLibrary = _ratingsAndReputationLibrary)
    .then(() => RatingsAndReputationLibrary.deployed())
    .then(ratingLibrary => ratingLibrary.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(RatingsAndReputationLibrary.address))
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(RatingsAndReputationLibrary.address, 'RatingsAndReputationLibrary'))
    .then(() => {
        let sig = ratingsAndReputationLibrary.contract.evaluateArea.getData(0,0,0).slice(0, 10);
        return rolesLibrary.addRoleCapability(RolesLibraryEvaluatorRole, RatingsAndReputationLibrary.address, sig);
    })
    .then(() => {
        let sig = ratingsAndReputationLibrary.contract.evaluateCategory.getData(0,0,0,0).slice(0, 10);
        return rolesLibrary.addRoleCapability(RolesLibraryEvaluatorRole, RatingsAndReputationLibrary.address, sig);
    })
    .then(() => {
        let sig = ratingsAndReputationLibrary.contract.evaluateSkill.getData(0,0,0,0,0).slice(0, 10);
        return rolesLibrary.addRoleCapability(RolesLibraryEvaluatorRole, RatingsAndReputationLibrary.address, sig);
    })
    .then(() => {
        let sig = ratingsAndReputationLibrary.contract.evaluateMany.getData(0,0,[],[],[]).slice(0, 10);
        return rolesLibrary.addRoleCapability(RolesLibraryEvaluatorRole, RatingsAndReputationLibrary.address, sig);
    })
    .then(() => console.log("[Migration] RatingsAndReputationLibrary #initialized"))
};
