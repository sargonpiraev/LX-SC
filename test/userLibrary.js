const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const RolesLibrary = artifacts.require('./RolesLibrary.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('UserLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let rolesLibrary;
  let userLibrary;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => RolesLibrary.deployed())
    .then(instance => rolesLibrary = instance)
    .then(() => UserLibrary.deployed())
    .then(instance => userLibrary = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => rolesLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => userLibrary.setRolesLibrary(rolesLibrary.address))
    .then(() => userLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(userLibrary.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should add user role', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isTrue);
  });

  it('should emit AddRole event in EventsHistory', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'AddRole');
      assert.equal(result.logs[0].args.user, user);
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not have user role by default', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should remove user role', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.removeRole(user, role))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should emit RemoveRole event in EventsHistory', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userLibrary.removeRole(user, role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RemoveRole');
      assert.equal(result.logs[0].args.user, user);
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not add user role if not allowed', () => {
    const user = accounts[1];
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role, {from: nonOwner}))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should not add user role if not present in RolesLibrary', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isFalse);
  });

  it('should not remove user role if not allowed', () => {
    const user = accounts[1];
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.removeRole(user, role, {from: nonOwner}))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isTrue);
  });

  it('should add several user roles', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.addRole(user, role2))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isTrue)
    .then(() => userLibrary.hasRole(user, role2))
    .then(asserts.isTrue);
  });

  it('should differentiate users', () => {
    const user = accounts[1];
    const user2 = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.addRole(user2, role2))
    .then(() => userLibrary.hasRole(user2, role))
    .then(asserts.isFalse)
    .then(() => userLibrary.hasRole(user, role2))
    .then(asserts.isFalse)
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isTrue)
    .then(() => userLibrary.hasRole(user2, role2))
    .then(asserts.isTrue);
  });

  it('should return all user roles', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const role3 = '0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => rolesLibrary.addRole(role3))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.addRole(user, role2))
    .then(() => userLibrary.addRole(user, role3))
    .then(() => userLibrary.getUserRoles(user))
    .then(roles => {
      assert.equal(roles.length, 3);
      assert.equal(roles[0], role);
      assert.equal(roles[1], role2);
      assert.equal(roles[2], role3);
    })
    .then(() => userLibrary.removeRole(user, role2))
    .then(() => userLibrary.getUserRoles(user))
    .then(roles => {
      assert.equal(roles.length, 2);
      assert.equal(roles[0], role);
      assert.equal(roles[1], role3);
    });
  });

  it('should return only user roles from RolesLibrary', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const role3 = '0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => rolesLibrary.addRole(role3))
    .then(() => userLibrary.addRole(user, role))
    .then(() => userLibrary.addRole(user, role2))
    .then(() => userLibrary.addRole(user, role3))
    .then(() => rolesLibrary.removeRole(role2))
    .then(() => userLibrary.getUserRoles(user))
    .then(roles => {
      assert.equal(roles.length, 2);
      assert.equal(roles[0], role);
      assert.equal(roles[1], role3);
    });
  });

  it('should return user role even if not present in RolesLibrary', () => {
    const user = accounts[1];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => userLibrary.addRole(user, role))
    .then(() => rolesLibrary.removeRole(role))
    .then(() => userLibrary.hasRole(user, role))
    .then(asserts.isTrue);
  });
});
