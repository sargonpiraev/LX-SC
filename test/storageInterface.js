const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageUser = artifacts.require('./StorageUser.sol');

contract('StorageInterface', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let storageUser;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => StorageUser.deployed())
    .then(instance => storageUser = instance)
    .then(reverter.snapshot);
  });

  it('should store uint values', () => {
    const value = web3.toBigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    return storageUser.setUInt(value)
    .then(() => storageUser.getUInt())
    .then(asserts.equal(value));
  });

  it('should store address values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffff';
    return storageUser.setAddress(value)
    .then(() => storageUser.getAddress())
    .then(asserts.equal(value));
  });

  it('should store bool values', () => {
    const value = true;
    return storageUser.setBool(value)
    .then(() => storageUser.getBool())
    .then(asserts.equal(value));
  });

  it('should store int values', () => {
    const value = web3.toBigNumber(2).pow(255).sub(1).mul(-1);
    return storageUser.setInt(value)
    .then(() => storageUser.getInt())
    .then(asserts.equal(value));
  });

  it('should store bytes32 values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageUser.setBytes32(value)
    .then(() => storageUser.getBytes32())
    .then(asserts.equal(value));
  });

  it('should store bytes32 => bytes32 mapping values', () => {
    const key = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageUser.setMapping(key, value)
    .then(() => storageUser.getMapping(key))
    .then(asserts.equal(value));
  });
});
