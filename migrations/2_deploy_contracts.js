const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');

module.exports = deployer => {
    deployer.deploy(Storage);
    deployer.deploy(ManagerMock);
};
