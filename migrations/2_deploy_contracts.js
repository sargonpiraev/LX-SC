const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageInterface = artifacts.require('./StorageInterface.sol');
const StorageUser = artifacts.require('./StorageUser.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');

module.exports = deployer => {
  let eventsHistory;
  deployer.deploy(ManagerMock)
  .then(() => deployer.deploy(Storage))
  .then(() => deployer.deploy(StorageInterface))
  .then(() => deployer.link(StorageInterface, [StorageUser, UserLibrary]))
  .then(() => deployer.deploy(StorageUser, Storage.address, 'StorageUserCrate'))
  .then(() => deployer.deploy(EventsHistory))
  .then(() => EventsHistory.deployed())
  .then(instance => eventsHistory = instance)
  .then(() => deployer.deploy(UserLibrary, Storage.address, 'UserLibraryCrate'))
};
