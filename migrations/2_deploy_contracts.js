const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageInterface = artifacts.require('./StorageInterface.sol');
const StorageUser = artifacts.require('./StorageUser.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const UserManager = artifacts.require('./UserManager.sol');
const UserManagerEmitter = artifacts.require('./UserManagerEmitter.sol');

module.exports = deployer => {
  let userManagerEmitter;
  let eventsHistory;
  deployer.deploy(ManagerMock)
  .then(() => deployer.deploy(Storage))
  .then(() => deployer.deploy(StorageInterface))
  .then(() => deployer.link(StorageInterface, [StorageUser, UserManager]))
  .then(() => deployer.deploy(StorageUser, Storage.address, 'StorageUserCrate'))
  .then(() => deployer.deploy(EventsHistory))
  .then(() => EventsHistory.deployed())
  .then(instance => eventsHistory = instance)
  .then(() => deployer.deploy(UserManager, Storage.address, 'UserManagerCrate'))
  .then(() => deployer.deploy(UserManagerEmitter))
  .then(() => UserManagerEmitter.deployed())
  .then(instance => userManagerEmitter = instance)
  // Add all the future emitters here.
  .then(() => eventsHistory.addEmitter(userManagerEmitter.contract.emitAddRole.getData().slice(0, 10), userManagerEmitter.address))
  .then(() => eventsHistory.addEmitter(userManagerEmitter.contract.emitRemoveRole.getData().slice(0, 10), userManagerEmitter.address));
};
