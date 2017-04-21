const StorageInterface = artifacts.require('./StorageInterface.sol');
const UserProxyTester = artifacts.require('./UserProxyTester.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const StorageTester = artifacts.require('./StorageTester.sol');
const FakeCoin = artifacts.require('./FakeCoin.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const RolesLibrary = artifacts.require('./RolesLibrary.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const Mock = artifacts.require('./Mock.sol');
const UserProxy = artifacts.require('./UserProxy.sol');
const Storage = artifacts.require('./Storage.sol');
const User = artifacts.require('./User.sol');

module.exports = deployer => {
  let eventsHistory;
  deployer.deploy(ManagerMock)
  .then(() => deployer.deploy(Mock))
  .then(() => deployer.deploy(StorageManager))
  .then(() => deployer.deploy(BalanceHolder))
  .then(() => deployer.deploy(Storage))
  .then(() => deployer.deploy(StorageInterface))
  .then(() => deployer.link(StorageInterface, [StorageTester, UserLibrary]))
  .then(() => deployer.deploy(StorageTester, Storage.address, 'StorageTester'))
  .then(() => deployer.deploy(FakeCoin))
  .then(() => deployer.deploy(EventsHistory))
  .then(() => EventsHistory.deployed())
  .then(instance => eventsHistory = instance)
  .then(() => deployer.deploy(User, Storage.address, 'User'))
  .then(() => deployer.deploy(UserProxy))
  .then(() => deployer.deploy(UserProxyTester))
  .then(() => deployer.deploy(RolesLibrary, Storage.address, 'RolesLibrary'))
  .then(() => deployer.deploy(UserLibrary, Storage.address, 'UserLibrary'))
  .then(() => deployer.deploy(ERC20Library, Storage.address, 'ERC20Library'))
  .then(() => deployer.deploy(PaymentGateway, Storage.address, 'PaymentGateway'))
  .then(() => true);
};
