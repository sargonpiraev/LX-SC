const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const SkillsLibrary = artifacts.require('./SkillsLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('SkillsLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let skillsLibrary;

  const getFlag = index => {
    return web3.toBigNumber(2).pow(index*2);
  };

  const equal = (a, b) => {
    return a.valueOf() === b.valueOf();
  };

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => SkillsLibrary.deployed())
    .then(instance => skillsLibrary = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => skillsLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(skillsLibrary.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should be able to set area hash', () => {
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const area = getFlag(0);
    return Promise.resolve()
    .then(() => skillsLibrary.setArea(area, hash))
    .then(() => skillsLibrary.getArea(area))
    .then(asserts.equal(hash))
    .then(() => true);
  });

  it('should be able to rewrite area hash', () => {
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const hash2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const area = getFlag(0);
    return Promise.resolve()
    .then(() => skillsLibrary.setArea(area, hash))
    .then(() => skillsLibrary.setArea(area, hash2))
    .then(() => skillsLibrary.getArea(area))
    .then(asserts.equal(hash2))
    .then(() => true);
  });

  it('should store hashes for different areas', () => {
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const hash2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const area = getFlag(0);
    const area2 = getFlag(1);
    return Promise.resolve()
    .then(() => skillsLibrary.setArea(area, hash))
    .then(() => skillsLibrary.setArea(area2, hash2))
    .then(() => skillsLibrary.getArea(area))
    .then(asserts.equal(hash))
    .then(() => skillsLibrary.getArea(area2))
    .then(asserts.equal(hash2))
    .then(() => true);
  });

  it('should not set area from non owner', () => {
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const area = getFlag(0);
    return Promise.resolve()
    .then(() => skillsLibrary.setArea(area, hash, {from: accounts[1]}))
    .then(() => skillsLibrary.getArea(area))
    .then(asserts.equal(0))
    .then(() => true);
  });
    // event AreaSet(uint area, bytes32 hash, uint version);
    // event CategorySet(uint area, uint category, bytes32 hash, uint version);
    // event SkillSet(uint area, uint category, uint skill, bytes32 hash, uint version);

  it('should emit AreaSet event when area set', () => {
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const area = getFlag(0);
    return Promise.resolve()
    .then(() => skillsLibrary.setArea(area, hash))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'AreaSet');
      equal(result.logs[0].args.area, area);
      equal(result.logs[0].args.hash, hash);
    })
    .then(() => true);
  });
});
