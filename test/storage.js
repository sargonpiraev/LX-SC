const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');

contract('Storage', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  const KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const CRATE = 'SomeCrate';

  before('setup', () => {
    return Storage.deployed()
    .then(instance => {
      storage = instance;
      return ManagerMock.deployed();
    })
    .then(instance => storage.setManager(instance.address))
    .then(reverter.snapshot);
  });

  it('should store uint values', () => {
    const value = web3.toBigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    return storage.setUInt(CRATE, KEY, value)
    .then(() => storage.getUInt(CRATE, KEY))
    .then(asserts.equal(value));
  });

  it('should store address values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffff';
    return storage.setAddress(CRATE, KEY, value)
    .then(() => storage.getAddress(CRATE, KEY))
    .then(asserts.equal(value));
  });

  it('should store bool values', () => {
    const value = true;
    return storage.setBool(CRATE, KEY, value)
    .then(() => storage.getBool(CRATE, KEY))
    .then(asserts.equal(value));
  });

  it('should store int values', () => {
    const value = web3.toBigNumber(2).pow(255).sub(1).mul(-1);
    return storage.setInt(CRATE, KEY, value)
    .then(() => storage.getInt(CRATE, KEY))
    .then(asserts.equal(value));
  });

  it('should store bytes32 values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storage.setBytes32(CRATE, KEY, value)
    .then(() => storage.getBytes32(CRATE, KEY))
    .then(asserts.equal(value));
  });
});
