"use strict";
const UserProxyTester = artifacts.require('./UserProxyTester.sol');
const StorageTester = artifacts.require('./StorageTester.sol');
const UserMock = artifacts.require('./UserMock.sol');
const Mock = artifacts.require('./Mock.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const UserLibraryMock = artifacts.require('./UserLibraryMock.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = (deployer, network) => {
    if (network === "development") {
        deployer.deploy(UserProxyTester)
        .then(() => deployer.deploy(StorageTester, Storage.address, 'StorageTester'))
        .then(() => deployer.deploy(UserMock))
        .then(() => deployer.deploy(Mock))
        .then(() => deployer.deploy(ManagerMock))
        .then(() => deployer.deploy(UserLibraryMock))
        .then(() => console.log("[Migration] Testnet #deployed"));
    }
};
