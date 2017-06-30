const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const RolesLibrary = artifacts.require('./RolesLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

contract('RolesLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let rolesLibrary;
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let mock;

  const ignoreAuth = (enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  };

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => ignoreAuth())
    .then(() => Storage.deployed())
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
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isTrue);
  });

  it('should emit RoleAdded event in EventsHistory', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RoleAdded');
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not have role by default', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isFalse);
  });

  it('should remove role', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.removeRole(role))
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isFalse);
  });

  it('should emit RoleRemoved event in EventsHistory', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.removeRole(role))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RoleRemoved');
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should not add role if not allowed', () => {
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role, {from: nonOwner}))
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isFalse);
  });

  it('should not remove role if not allowed', () => {
    const nonOwner = accounts[2];
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.removeRole(role, {from: nonOwner}))
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isTrue);
  });

  it('should add several roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role2))
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isTrue)
    .then(() => rolesLibrary.includes(role2))
    .then(asserts.isTrue);
  });

  it('should differentiate roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.includes(role))
    .then(asserts.isTrue)
    .then(() => rolesLibrary.includes(role2))
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

  it('should not duplicate roles', () => {
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.addRole(role))
    .then(() => rolesLibrary.getRoles())
    .then(roles => {
      assert.equal(roles.length, 1);
      assert.equal(roles[0], role);
    });
  });
});
