const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const RolesLibrary = artifacts.require('./RolesLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('RolesLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let rolesLibrary;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => RolesLibrary.deployed())
    .then(instance => rolesLibrary = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => rolesLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(rolesLibrary.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should add role', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isTrue);
  });

  it('should emit AddRole event in EventsHistory', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'AddRole');
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not have role by default', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.include(role))
    .then(asserts.isFalse);
  });

  it('should remove role', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.removeRole(role))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isFalse);
  });

  it('should emit RemoveRole event in EventsHistory', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.removeRole(role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RemoveRole');
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not add role if not allowed', () => {
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role, {from: nonOwner}))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isFalse);
  });

  it('should not remove role if not allowed', () => {
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.removeRole(role, {from: nonOwner}))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isTrue);
  });

  it('should add several roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isTrue)
    .then(() => rolesLibrary.include(role2))
    .then(asserts.isTrue);
  });

  it('should differentiate roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.include(role))
    .then(asserts.isTrue)
    .then(() => rolesLibrary.include(role2))
    .then(asserts.isFalse);
  });

  it('should return all roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const role3 = '0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => rolesLibrary.addRole(role3))
    .then(() => rolesLibrary.getRoles())
    .then(roles => {
      assert.equal(roles.length, 3);
      assert.equal(roles[0], role);
      assert.equal(roles[1], role2);
      assert.equal(roles[2], role3);
    })
    .then(() => rolesLibrary.removeRole(role2))
    .then(() => rolesLibrary.getRoles())
    .then(roles => {
      assert.equal(roles.length, 2);
      assert.equal(roles[0], role);
      assert.equal(roles[1], role3);
    });
  });
});
