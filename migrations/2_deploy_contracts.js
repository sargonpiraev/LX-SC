const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageInterface = artifacts.require('./StorageInterface.sol');
const StorageUser = artifacts.require('./StorageUser.sol');

module.exports = deployer => {
  deployer.deploy(ManagerMock)
  .then(() => deployer.deploy(Storage))
  .then(() => deployer.deploy(StorageInterface))
  .then(() => deployer.link(StorageInterface, StorageUser))
  .then(() => deployer.deploy(StorageUser, Storage.address, 'StorageUserCrate'));
};
