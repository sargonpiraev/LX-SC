const StorageInterface = artifacts.require('./StorageInterface.sol');
const ProxyUserTester = artifacts.require('./ProxyUserTester.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const StorageTester = artifacts.require('./StorageTester.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const ProxyUser = artifacts.require('./ProxyUser.sol');
const Storage = artifacts.require('./Storage.sol');
const User = artifacts.require('./User.sol');

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
  .then(() => deployer.deploy(UserLibrary, Storage.address, 'UserLibraryCrate'))
  .then(() => deployer.deploy(User))
  .then(() => deployer.deploy(ProxyUser))
  .then(() => deployer.deploy(ProxyUserTester))
};
