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

  describe('Roles', function() {
    it('should add user role', () => {
      const user = accounts[1];
      const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
      .then(() => rolesLibrary.addRole(role))
      .then(() => userLibrary.addRole(user, role))
      .then(() => userLibrary.hasRole(user, role))
      .then(asserts.isTrue);
    });

    it('should emit RoleAdded event in EventsHistory', () => {
      const user = accounts[1];
      const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
      .then(() => rolesLibrary.addRole(role))
      .then(() => userLibrary.addRole(user, role))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, eventsHistory.address);
        assert.equal(result.logs[0].event, 'RoleAdded');
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

    it('should emit RoleRemoved event in EventsHistory', () => {
      const user = accounts[1];
      const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
      .then(() => userLibrary.removeRole(user, role))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, eventsHistory.address);
        assert.equal(result.logs[0].event, 'RoleRemoved');
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

    it('should return user role only if present in RolesLibrary', () => {
      const user = accounts[1];
      const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
      .then(() => rolesLibrary.addRole(role))
      .then(() => userLibrary.addRole(user, role))
      .then(() => rolesLibrary.removeRole(role))
      .then(() => userLibrary.hasRole(user, role))
      .then(asserts.isFalse);
    });
  });

  describe('Skills', function() {
    const getFlag = index => {
      return web3.toBigNumber(2).pow(index*2);
    };

    const getEvenFlag = index => {
      return web3.toBigNumber(2).pow(index*2 + 1);
    };

    const addFlags = (...flags) => {
      if (flags.length == 1) {
        return flags[0];
      }
      return addFlags(flags[0].add(flags[1]), ...flags.slice(2));
    };

    const partialFlag = getFlag;
    const fullFlag = getEvenFlag;
    const partialAndFullFlag = index => partialFlag(index).add(fullFlag(index));

    const equal = (a, b) => {
      return a.valueOf() === b.valueOf();
    };

    const parseBigNumbers = bigs => bigs.map(big => big.toString());

    const assertUserSkills = (user, expectedSkills) => {
      let actualSkills;
      return () =>
        userLibrary.getUserSkills(user)
        .then(([areas, categories, skills]) => {
          actualSkills = [areas.toString(), parseBigNumbers(categories), parseBigNumbers(skills)];
          expSkills = [expectedSkills[0].toString(), parseBigNumbers(expectedSkills[1]), parseBigNumbers(expectedSkills[2])];
          assert.deepEqual(actualSkills, expSkills);
        })
        .catch(err => {
          console.log('Actual skills:', actualSkills);
          throw err;
        });
    };

    it('should set user areas', () => {
      const user = accounts[1];
      const areas = addFlags(partialAndFullFlag(0));
      const categories = [];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set different user areas', () => {
      const user = accounts[1];
      const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(3));
      const categories = [];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set different user areas ignoring excess categories', () => {
      const user = accounts[1];
      const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(3));
      const categories = [addFlags(partialAndFullFlag(0))];
      const skills = [];
      const expectedSkills = [ areas, [], skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set different user areas ignoring excess skills', () => {
      const user = accounts[1];
      const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(3));
      const categories = [];
      const skills = [addFlags(partialFlag(0))];
      const expectedSkills = [ areas, categories, [] ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should not set user area with full flag without partial flag', () => {
      const user = accounts[1];
      const areas = addFlags(fullFlag(0));
      const categories = [];
      const skills = [];
      const expectedSkills = [ 0, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should not set user area with partial flag without categories', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [];
      const skills = [];
      const expectedSkills = [ 0, categories, skills ];
      return Promise.resolve()
      .then(() => asserts.throws(userLibrary.setMany(user, areas, categories, skills)))
      .then(() => true);
    });

    it('should set different user areas with partial flag with categories', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0), partialFlag(3));
      const categories = [addFlags(partialAndFullFlag(0)), addFlags(partialAndFullFlag(0))];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set user categories', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialAndFullFlag(0))];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set different user categories', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialAndFullFlag(0), partialAndFullFlag(3))];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should not set user categories with partial flag without skills', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialFlag(0))];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => asserts.throws(userLibrary.setMany(user, areas, categories, skills)))
      .then(() => true);
    });

    it('should not set user categories with full flag without partial flag', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(fullFlag(0))];
      const skills = [];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => asserts.throws(userLibrary.setMany(user, areas, categories, skills)))
      .then(() => true);
    });

    it('should set user skills', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialFlag(0))];
      const skills = [addFlags(getFlag(0))];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set different user skills', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialFlag(0))];
      const skills = [addFlags(getFlag(0), getFlag(1))];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should set user skills with even and odd flags', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialFlag(0))];
      const skills = [addFlags(getFlag(0), getEvenFlag(1))];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it('should not set user skills for full category', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialAndFullFlag(0))];
      const skills = [addFlags(getFlag(0))];
      const expectedSkills = [ areas, categories, [] ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });

    it.skip('should set different everything', () => {
      const user = accounts[1];
      const areas = addFlags(partialFlag(0));
      const categories = [addFlags(partialFlag(0))];
      const skills = [addFlags(getFlag(0), getFlag(1))];
      const expectedSkills = [ areas, categories, skills ];
      return Promise.resolve()
      .then(() => userLibrary.setMany(user, areas, categories, skills))
      .then(assertUserSkills(user, expectedSkills))
      .then(() => true);
    });
  });
});
