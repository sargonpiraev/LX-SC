"use strict";
const UserFactory = artifacts.require('./UserFactory.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

module.exports = deployer => {
    const UserFactoryRole = 20;
    let userFactory;
    let rolesLibrary;

    deployer
    .then(() => Roles2Library.deployed())
    .then(_roles2Library => rolesLibrary = _roles2Library)
    .then(() => UserFactory.deployed())
    .then(_userFactory => userFactory = _userFactory)
    .then(() => userFactory.setupEventsHistory(MultiEventsHistory.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(UserFactory.address))
    .then(() => {
        let sig = rolesLibrary.contract.addUserRole.getData(0,[0]).slice(0, 10);
        return rolesLibrary.addRoleCapability(UserFactoryRole, Roles2Library.address, sig);
    })
    .then(() => rolesLibrary.addUserRole(UserFactory.address, UserFactoryRole))
    .then(() => console.log("[Migration] UserFactory #initialized"))
};
