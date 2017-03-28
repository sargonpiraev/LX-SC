const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const StorageTester = artifacts.require('./StorageTester.sol');

contract('StorageInterface', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let storageTester;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => StorageTester.deployed())
    .then(instance => storageTester = instance)
    .then(reverter.snapshot);
  });

  it('should store uint values', () => {
    const value = web3.toBigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    return storageTester.setUInt(value)
    .then(() => storageTester.getUInt())
    .then(asserts.equal(value));
  });

  it('should store address values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffff';
    return storageTester.setAddress(value)
    .then(() => storageTester.getAddress())
    .then(asserts.equal(value));
  });

  it('should store bool values', () => {
    const value = true;
    return storageTester.setBool(value)
    .then(() => storageTester.getBool())
    .then(asserts.equal(value));
  });

  it('should store int values', () => {
    const value = web3.toBigNumber(2).pow(255).sub(1).mul(-1);
    return storageTester.setInt(value)
    .then(() => storageTester.getInt())
    .then(asserts.equal(value));
  });

  it('should store bytes32 values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageTester.setBytes32(value)
    .then(() => storageTester.getBytes32())
    .then(asserts.equal(value));
  });

  it('should store bytes32 => bytes32 mapping values', () => {
    const key = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageTester.setMapping(key, value)
    .then(() => storageTester.getMapping(key))
    .then(asserts.equal(value));
  });

  it('should store bytes32 set values', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const value2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return storageTester.addSet(value)
    .then(() => storageTester.includeSet(value))
    .then(asserts.isTrue)
    .then(() => storageTester.includeSet(value2))
    .then(asserts.isFalse)
    .then(() => storageTester.countSet())
    .then(asserts.equal(1))
    .then(() => storageTester.getSet())
    .then(set => {
      assert.equal(set.length, 1);
      assert.equal(set[0], value);
    })
    .then(() => storageTester.addSet(value2))
    .then(() => storageTester.includeSet(value))
    .then(asserts.isTrue)
    .then(() => storageTester.includeSet(value2))
    .then(asserts.isTrue)
    .then(() => storageTester.countSet())
    .then(asserts.equal(2))
    .then(() => storageTester.getSet())
    .then(set => {
      assert.equal(set.length, 2);
      assert.equal(set[0], value);
      assert.equal(set[1], value2);
    })
    .then(() => storageTester.removeSet(value))
    .then(() => storageTester.includeSet(value))
    .then(asserts.isFalse)
    .then(() => storageTester.includeSet(value2))
    .then(asserts.isTrue)
    .then(() => storageTester.countSet())
    .then(asserts.equal(1))
    .then(() => storageTester.getSet())
    .then(set => {
      assert.equal(set.length, 1);
      assert.equal(set[0], value2);
    })
    .then(() => storageTester.removeSet(value2))
    .then(() => storageTester.includeSet(value))
    .then(asserts.isFalse)
    .then(() => storageTester.includeSet(value2))
    .then(asserts.isFalse)
    .then(() => storageTester.countSet())
    .then(asserts.equal(0))
    .then(() => storageTester.getSet())
    .then(set => {
      assert.equal(set.length, 0);
    });
  });
});
