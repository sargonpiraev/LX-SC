"use strict";
const UserFactory = artifacts.require('./UserFactory.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.deploy(UserFactory, Roles2Library.address)
    .then(() => console.log("[Migration] UserFactory #deployed"))
};
