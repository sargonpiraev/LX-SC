"use strict";
const UserLibrary = artifacts.require('./UserLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(UserLibrary, Storage.address, 'UserLibrary', Roles2Library.address)
    .then(() => console.log("[Migration] UserLibrary #deployed"))
};
