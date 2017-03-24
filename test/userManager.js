const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const UserManager = artifacts.require('./UserManager.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('UserManager', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let userManager;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => UserManager.deployed())
    .then(instance => userManager = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => userManager.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(userManager.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should add user role', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role))
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isTrue);
  });

  it('should not have user role by default', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should remove user role', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role))
    .then(() => userManager.removeRole(user, role))
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should not add user role if not allowed', () => {
    const user = accounts[1];
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role, {from: nonOwner}))
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should not remove user role if not allowed', () => {
    const user = accounts[1];
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role))
    .then(() => userManager.removeRole(user, role, {from: nonOwner}))
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isTrue);
  });

  it('should add several user roles', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role))
    .then(() => userManager.addRole(user, role2))
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isTrue)
    .then(() => userManager.hasRole(user, role2))
    .then(asserts.isTrue);
  });

  it('should differentiate users', () => {
    const user = accounts[1];
    const user2 = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => userManager.addRole(user, role))
    .then(() => userManager.addRole(user2, role2))
    .then(() => userManager.hasRole(user2, role))
    .then(asserts.isFalse)
    .then(() => userManager.hasRole(user, role2))
    .then(asserts.isFalse)
    .then(() => userManager.hasRole(user, role))
    .then(asserts.isTrue)
    .then(() => userManager.hasRole(user2, role2))
    .then(asserts.isTrue);
  });
});
