const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

contract('Roles2Library', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let multiEventsHistory;
  let rolesLibrary;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => Roles2Library.deployed())
    .then(instance => rolesLibrary = instance)
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => rolesLibrary.setupEventsHistory(multiEventsHistory.address))
    .then(() => multiEventsHistory.authorize(rolesLibrary.address))
    .then(reverter.snapshot);
  });

  describe('User Roles', function() {
    it('should add user role', () => {
      const user = accounts[1];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isTrue)
      .then(() => true);
    });

    it('should emit RoleAdded event in EventsHistory', () => {
      const user = accounts[1];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, multiEventsHistory.address);
        assert.equal(result.logs[0].event, 'RoleAdded');
        assert.equal(result.logs[0].args.user, user);
        assert.equal(result.logs[0].args.role, role);
        assert.equal(result.logs[0].args.self, rolesLibrary.address);
      })
      .then(() => true);
    });

    it('should not have user role by default', () => {
      const user = accounts[1];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isFalse)
      .then(() => rolesLibrary.addUserRole(user, role-1))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isFalse)
      .then(() => true);
    });

    it('should remove user role', () => {
      const user = accounts[1];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.removeUserRole(user, role))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isFalse)
      .then(() => true);
    });

    it('should emit RoleRemoved event in EventsHistory', () => {
      const user = accounts[1];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.removeUserRole(user, role))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, multiEventsHistory.address);
        assert.equal(result.logs[0].event, 'RoleRemoved');
        assert.equal(result.logs[0].args.user, user);
        assert.equal(result.logs[0].args.role, role);
        assert.equal(result.logs[0].args.self, rolesLibrary.address);
      })
      .then(() => true);
    });

    it('should not add user role if not allowed', () => {
      const user = accounts[1];
      const nonOwner = accounts[2];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role, {from: nonOwner}))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isFalse)
      .then(() => true);
    });

    it('should not add user role if not allowed', () => {
      const user = accounts[1];
      const nonOwner = accounts[2];
      const role = 255;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.removeUserRole(user, role, {from: nonOwner}))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isTrue)
      .then(() => true);
    });

    it('should add several user roles', () => {
      const user = accounts[1];
      const role = 255;
      const role2 = 0;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.addUserRole(user, role2))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isTrue)
      .then(() => rolesLibrary.hasUserRole(user, role2))
      .then(asserts.isTrue)
      .then(() => true);
    });

    it('should differentiate users', () => {
      const user = accounts[1];
      const user2 = accounts[2];
      const role = 255;
      const role2 = 0;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.addUserRole(user2, role2))
      .then(() => rolesLibrary.hasUserRole(user, role))
      .then(asserts.isTrue)
      .then(() => rolesLibrary.hasUserRole(user2, role2))
      .then(asserts.isTrue)
      .then(() => rolesLibrary.hasUserRole(user, role2))
      .then(asserts.isFalse)
      .then(() => rolesLibrary.hasUserRole(user2, role))
      .then(asserts.isFalse)
      .then(() => true);
    });

    it('should return all user roles', () => {
      const user = accounts[1];
      const role = 255;
      const role2 = 0;
      const role3 = 133;
      return Promise.resolve()
      .then(() => rolesLibrary.addUserRole(user, role))
      .then(() => rolesLibrary.addUserRole(user, role2))
      .then(() => rolesLibrary.addUserRole(user, role3))
      .then(() => rolesLibrary.getUserRoles(user))
      .then(asserts.equal('0x8000000000000000000000000000002000000000000000000000000000000001'))
      .then(() => rolesLibrary.removeUserRole(user, role2))
      .then(() => rolesLibrary.getUserRoles(user))
      .then(asserts.equal('0x8000000000000000000000000000002000000000000000000000000000000000'))
      .then(() => true);
    });
  });

  it('should add capability', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x8000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should emit CapabilityAdded event in EventsHistory', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'CapabilityAdded');
      assert.equal(result.logs[0].args.code, code);
      assert.equal(result.logs[0].args.sig, sig);
      assert.equal(result.logs[0].args.role, role);
      assert.equal(result.logs[0].args.self, rolesLibrary.address);
    });
  });

  it('should not have capability by default', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    const sig2 = '0xffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x0000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => rolesLibrary.addRoleCapability(role, code, sig2))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x0000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should remove capability', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.removeRoleCapability(role, code, sig))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x0000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should emit CapabilityRemoved event in EventsHistory', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.removeRoleCapability(role, code, sig))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'CapabilityRemoved');
      assert.equal(result.logs[0].args.code, code);
      assert.equal(result.logs[0].args.sig, sig);
      assert.equal(result.logs[0].args.role, role);
      assert.equal(result.logs[0].args.self, rolesLibrary.address);
    })
    .then(() => true);
  });

  it('should not add capability if not allowed', () => {
    const nonOwner = accounts[2];
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig, {from: nonOwner}))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x0000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should not remove role if not allowed', () => {
    const nonOwner = accounts[2];
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.addRoleCapability(role, code, sig, {from: nonOwner}))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x8000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should add several capabilities', () => {
    const role = 255;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    const sig2 = '0xffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.addRoleCapability(role, code, sig2))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x8000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig2))
    .then(asserts.equal('0x8000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => true);
  });

  it('should differentiate capabilities', () => {
    const role = 255;
    const role2 = 0;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    const sig2 = '0xffffff00';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.addRoleCapability(role2, code, sig2))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x8000000000000000000000000000000000000000000000000000000000000000'))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig2))
    .then(asserts.equal('0x0000000000000000000000000000000000000000000000000000000000000001'))
    .then(() => true);
  });

  it('should return all roles', () => {
    const role = 255;
    const role2 = 0;
    const role3 = 131;
    const code = '0xffffffffffffffffffffffffffffffffffffffff';
    const sig = '0xffffffff';
    return Promise.resolve()
    .then(() => rolesLibrary.addRoleCapability(role, code, sig))
    .then(() => rolesLibrary.addRoleCapability(role2, code, sig))
    .then(() => rolesLibrary.addRoleCapability(role3, code, sig))
    .then(() => rolesLibrary.getCapabilityRoles(code, sig))
    .then(asserts.equal('0x8000000000000000000000000000000800000000000000000000000000000001'))
    .then(() => true);
  });
});
