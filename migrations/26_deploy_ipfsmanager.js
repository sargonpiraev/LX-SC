"use strict";
const IPFSLibrary = artifacts.require('./IPFSLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(IPFSLibrary, Storage.address, 'IPFSLibrary', Roles2Library.address)
    .then(() => console.log("[Migration] IPFSLibrary #deployed"))
};
