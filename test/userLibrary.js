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

  const FROM_NON_OWNER = { from: accounts[5] };

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

    describe('SetMany', function() {
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

      it('should not set empty user categories', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0));
        const categories = [0];
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

      it('should not set empty user skills', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0));
        const categories = [addFlags(partialFlag(0))];
        const skills = [0];
        const expectedSkills = [ areas, categories, [] ];
        return Promise.resolve()
        .then(() => asserts.throws(userLibrary.setMany(user, areas, categories, skills)))
        .then(() => true);
      });

      it('should set different everything', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0), partialAndFullFlag(3), partialFlag(127));
        const categories = [addFlags(partialFlag(0)), addFlags(partialAndFullFlag(5), partialFlag(10), partialFlag(127))];
        const skills = [addFlags(getFlag(0), getFlag(1)), addFlags(getFlag(10), getEvenFlag(111)), addFlags(getEvenFlag(111))];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setMany(user, areas, categories, skills))
        .then(results => assert.equal(results.logs.length, 1 + categories.length + skills.length))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should overwrite different everything', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0), partialAndFullFlag(3), partialFlag(127));
        const categories = [addFlags(partialFlag(0)), addFlags(partialAndFullFlag(5), partialFlag(10), partialFlag(127))];
        const skills = [addFlags(getFlag(0), getFlag(1)), addFlags(getFlag(10), getEvenFlag(111)), addFlags(getEvenFlag(111))];
        const areas2 = addFlags(partialFlag(5));
        const categories2 = [addFlags(partialFlag(1), partialAndFullFlag(2))];
        const skills2 = [addFlags(getFlag(20), getEvenFlag(122))];
        const expectedSkills = [ areas2, categories2, skills2 ];
        return Promise.resolve()
        .then(() => userLibrary.setMany(user, areas, categories, skills))
        .then(() => userLibrary.setMany(user, areas2, categories2, skills2))
        .then(results => assert.equal(results.logs.length, 1 + categories2.length + skills2.length))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });
    });

    describe('AddMany', function() {
      it('should set user areas', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0));
        const categories = [];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => asserts.throws(userLibrary.addMany(user, areas, categories, skills)))
        .then(() => true);
      });

      it('should set different user areas with partial flag with categories', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0), partialFlag(3));
        const categories = [addFlags(partialAndFullFlag(0)), addFlags(partialAndFullFlag(0))];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => asserts.throws(userLibrary.addMany(user, areas, categories, skills)))
        .then(() => true);
      });

      it('should not set user categories with full flag without partial flag', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0));
        const categories = [addFlags(fullFlag(0))];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => asserts.throws(userLibrary.addMany(user, areas, categories, skills)))
        .then(() => true);
      });

      it('should set user skills', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0));
        const categories = [addFlags(partialFlag(0))];
        const skills = [addFlags(getFlag(0))];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
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
        .then(() => userLibrary.addMany(user, areas, categories, skills))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set empty user skills', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0));
        const categories = [addFlags(partialFlag(0))];
        const skills = [0];
        const expectedSkills = [ areas, categories, [] ];
        return Promise.resolve()
        .then(() => asserts.throws(userLibrary.addMany(user, areas, categories, skills)))
        .then(() => true);
      });

      it('should set different everything', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0), partialAndFullFlag(3), partialFlag(127));
        const categories = [addFlags(partialFlag(0)), addFlags(partialAndFullFlag(5), partialFlag(10), partialFlag(127))];
        const skills = [addFlags(getFlag(0), getFlag(1)), addFlags(getFlag(10), getEvenFlag(111)), addFlags(getEvenFlag(111))];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.addMany(user, areas, categories, skills))
        .then(results => assert.equal(results.logs.length, 6))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should add different everything', () => {
        const user = accounts[1];
        const areas = addFlags(partialFlag(0), partialAndFullFlag(3), partialFlag(127));
        const categories = [addFlags(partialFlag(0)), addFlags(partialAndFullFlag(5), partialFlag(10), partialFlag(127))];
        const skills = [addFlags(getFlag(0), getFlag(1)), addFlags(getFlag(10), getEvenFlag(111)), addFlags(getEvenFlag(111))];
        const areas2 = addFlags(partialFlag(0));
        const categories2 = [addFlags(partialFlag(0), partialAndFullFlag(2))];
        const skills2 = [addFlags(getFlag(20))];
        const expectedSkills = [ areas, categories2.concat(categories.slice(1)), skills2.concat(skills.slice(1)) ];
        return Promise.resolve()
        .then(() => userLibrary.setMany(user, areas, categories, skills))
        .then(() => userLibrary.addMany(user, areas2, categories2, skills2))
        .then(results => assert.equal(results.logs.length, 3))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });
    });

    describe('SetAreas', function() {
      it('should set user areas', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0));
        const categories = [];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, eventsHistory.address);
          assert.equal(result.logs[0].event, 'SkillAreasSet');
          assert.equal(result.logs[0].args.user, user);
          equal(result.logs[0].args.areas, areas);
        })
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should set different user areas', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(127));
        const categories = [];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should rewrite user areas', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(127));
        const areas2 = addFlags(partialAndFullFlag(2), partialAndFullFlag(126));
        const categories = [];
        const skills = [];
        const expectedSkills = [ areas2, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(() => userLibrary.setAreas(user, areas2))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should remove user areas', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0), partialAndFullFlag(127));
        const areas2 = 0;
        const categories = [];
        const skills = [];
        const expectedSkills = [ areas2, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(() => userLibrary.setAreas(user, areas2))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set partial user areas with empty categories', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0), partialFlag(10));
        const categories = [];
        const skills = [];
        const expectedSkills = [ 0, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should set partial user areas with categories', () => {
        const user = accounts[1];
        const area = partialFlag(10);
        const areas = addFlags(partialAndFullFlag(0), area);
        const categories = [addFlags(partialAndFullFlag(15))];
        const skills = [];
        const expectedSkills = [ areas, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(() => userLibrary.setAreas(user, 0))
        .then(() => userLibrary.setAreas(user, areas))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set full user areas without partial flag', () => {
        const user = accounts[1];
        const areas = addFlags(fullFlag(10));
        const categories = [];
        const skills = [];
        const expectedSkills = [ 0, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user areas by non owner', () => {
        const user = accounts[1];
        const areas = addFlags(partialAndFullFlag(0));
        const categories = [];
        const skills = [];
        const expectedSkills = [ 0, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, areas, FROM_NON_OWNER))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });
    });

    describe('SetCategories', function() {
      it('should set user categories', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialAndFullFlag(10))];
        const skills = [];
        const expectedSkills = [ area, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(result => {
          assert.equal(result.logs.length, 2);

          assert.equal(result.logs[0].address, eventsHistory.address);
          assert.equal(result.logs[0].event, 'SkillAreasSet');
          assert.equal(result.logs[0].args.user, user);
          equal(result.logs[0].args.areas, area);

          assert.equal(result.logs[1].address, eventsHistory.address);
          assert.equal(result.logs[1].event, 'SkillCategoriesSet');
          assert.equal(result.logs[1].args.user, user);
          equal(result.logs[1].args.area, area);
          equal(result.logs[1].args.categories, categories);
        })
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should set different user categories', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialAndFullFlag(10), partialAndFullFlag(127))];
        const skills = [];
        const expectedSkills = [ area, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should rewrite user categories', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialAndFullFlag(10), partialAndFullFlag(127))];
        const categories2 = [addFlags(partialAndFullFlag(0))];
        const skills = [];
        const expectedSkills = [ area, categories2, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(() => userLibrary.setCategories(user, area, categories2[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not remove user categories completely', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialAndFullFlag(10), partialAndFullFlag(127))];
        const categories2 = [0];
        const skills = [];
        const expectedSkills = [ area, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(() => userLibrary.setCategories(user, area, categories2[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set partial user categories with empty skills', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialFlag(10))];
        const skills = [];
        const expectedSkills = [ area, [0], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should set partial user categories with skills', () => {
        const user = accounts[1];
        const area = partialFlag(10);
        const category = partialFlag(15);
        const categories = [addFlags(partialAndFullFlag(1), category)];
        const categoriesCleared = [addFlags(partialAndFullFlag(2))];
        const skills = [addFlags(getFlag(11), getFlag(111))];
        const expectedSkills = [ area, categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills))
        .then(() => userLibrary.setCategories(user, area, categoriesCleared))
        .then(() => userLibrary.setCategories(user, area, categories))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user categories with many areas', () => {
        const user = accounts[1];
        const area = addFlags(partialFlag(0), partialFlag(1));
        const categories = [addFlags(partialAndFullFlag(10))];
        const skills = [];
        const expectedSkills = [ 0, [], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user categories with full area flags', () => {
        const user = accounts[1];
        const area = partialAndFullFlag(1);
        const categories = [addFlags(partialAndFullFlag(10))];
        const skills = [];
        const expectedSkills = [ 0, [], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set full user categories without partial flag', () => {
        const user = accounts[1];
        const area = partialFlag(1);
        const categories = [addFlags(fullFlag(10))];
        const skills = [];
        const expectedSkills = [ 0, [], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should add user area when setting user categories', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const area2 = partialFlag(5);
        const categories = [addFlags(partialAndFullFlag(10)), addFlags(partialAndFullFlag(15))];
        const skills = [];
        const expectedSkills = [ addFlags(area, area2), categories, skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0]))
        .then(() => userLibrary.setCategories(user, area2, categories[1]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user categories from non owner', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const categories = [addFlags(partialAndFullFlag(10))];
        const skills = [];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, categories[0], FROM_NON_OWNER))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });
    });

    describe('SetSkills', function() {
      it('should set user skills', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ area, [category], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(result => {
          assert.equal(result.logs.length, 3);

          assert.equal(result.logs[0].address, eventsHistory.address);
          assert.equal(result.logs[0].event, 'SkillAreasSet');
          assert.equal(result.logs[0].args.user, user);
          equal(result.logs[0].args.areas, area);

          assert.equal(result.logs[1].address, eventsHistory.address);
          assert.equal(result.logs[1].event, 'SkillCategoriesSet');
          assert.equal(result.logs[1].args.user, user);
          equal(result.logs[1].args.area, area);
          equal(result.logs[1].args.categories, category);

          assert.equal(result.logs[2].address, eventsHistory.address);
          assert.equal(result.logs[2].event, 'SkillsSet');
          assert.equal(result.logs[2].args.user, user);
          equal(result.logs[2].args.area, area);
          equal(result.logs[2].args.category, category);
          equal(result.logs[2].args.skills, skills);
        })
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should set different user skils', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15), getEvenFlag(35))];
        const expectedSkills = [ area, [category], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should rewrite user skills', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15), getEvenFlag(35))];
        const skills2 = [addFlags(getFlag(2))];
        const expectedSkills = [ area, [category], skills2 ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(() => userLibrary.setSkills(user, area, category, skills2[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not remove user skills completely', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15), getEvenFlag(35))];
        const skills2 = [0];
        const expectedSkills = [ area, [category], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(() => userLibrary.setSkills(user, area, category, skills2[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user skills with many areas', () => {
        const user = accounts[1];
        const area = addFlags(partialFlag(0), partialFlag(1));
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user skills with full area flags', () => {
        const user = accounts[1];
        const area = partialAndFullFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user skills with many categories', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = addFlags(partialFlag(10), partialAndFullFlag(15));
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user skills with full category flags', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialAndFullFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should add user area when setting user skills', () => {
        const user = accounts[1];
        const area = partialAndFullFlag(0);
        const area2 = partialFlag(5);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ addFlags(area, area2), [category], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setAreas(user, area))
        .then(() => userLibrary.setSkills(user, area2, category, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should add user category when setting user skills', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialAndFullFlag(10);
        const category2 = partialFlag(20);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ area, [addFlags(category, category2)], skills ];
        return Promise.resolve()
        .then(() => userLibrary.setCategories(user, area, category))
        .then(() => userLibrary.setSkills(user, area, category2, skills[0]))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });

      it('should not set user skills from non owner', () => {
        const user = accounts[1];
        const area = partialFlag(0);
        const category = partialFlag(10);
        const skills = [addFlags(getFlag(15))];
        const expectedSkills = [ 0, [], [] ];
        return Promise.resolve()
        .then(() => userLibrary.setSkills(user, area, category, skills[0], FROM_NON_OWNER))
        .then(assertUserSkills(user, expectedSkills))
        .then(() => true);
      });
    });
  });
});
