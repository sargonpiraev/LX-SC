const StorageManager = artifacts.require('./StorageManager.sol');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageInterface = artifacts.require('./StorageInterface.sol');
const StorageTester = artifacts.require('./StorageTester.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const RolesLibrary = artifacts.require('./RolesLibrary.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');

module.exports = deployer => {
  let eventsHistory;
  deployer.deploy(ManagerMock)
  .then(() => deployer.deploy(StorageManager))
  .then(() => deployer.deploy(Storage))
  .then(() => deployer.deploy(StorageInterface))
  .then(() => deployer.link(StorageInterface, [StorageTester, UserLibrary]))
  .then(() => deployer.deploy(StorageTester, Storage.address, 'StorageUserCrate'))
  .then(() => deployer.deploy(EventsHistory))
  .then(() => EventsHistory.deployed())
  .then(instance => eventsHistory = instance)
  .then(() => deployer.deploy(RolesLibrary, Storage.address, 'RolesLibraryCrate'))
  .then(() => deployer.deploy(UserLibrary, Storage.address, 'UserLibraryCrate'))
};
