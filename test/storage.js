const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

contract('Storage', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let manager;
  const KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const CRATE = 'SomeCrate';
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let mock;

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

  const assertExpectations = (expected = 0, callsCount = null) => {
    let expectationsCount;
    return () => {
      return mock.expectationsLeft()
      .then(asserts.equal(expected))
      .then(() => mock.expectationsCount())
      .then(result => expectationsCount = result)
      .then(() => mock.callsCount())
      .then(result => asserts.equal(callsCount === null ? expectationsCount : callsCount)(result));
    };
  };

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
    .then(instance => manager = instance)
    .then(() => storage.setManager(manager.address))
    .then(reverter.snapshot);
  });

  it('should check auth on setting a manager', () => {
    const caller = accounts[1];
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      storage.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        storage.address,
        storage.contract.setManager.getData().slice(0, 10)
      ), 0)
    )
    .then(() => storage.setManager(manager.address, {from: caller}))
    .then(assertExpectations());
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

  it('should not store uint values if not allowed', () => {
    const value = web3.toBigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    return manager.deny()
    .then(() => asserts.throws(storage.setUInt(CRATE, KEY, value)))
    .then(() => storage.getUInt(CRATE, KEY))
    .then(asserts.equal(0));
  });

  it('should not store address values if not allowed', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffff';
    return manager.deny()
    .then(() => asserts.throws(storage.setAddress(CRATE, KEY, value)))
    .then(() => storage.getAddress(CRATE, KEY))
    .then(asserts.equal(ZERO_ADDRESS));
  });

  it('should not store bool values if not allowed', () => {
    const value = true;
    return manager.deny()
    .then(() => asserts.throws(storage.setBool(CRATE, KEY, value)))
    .then(() => storage.getBool(CRATE, KEY))
    .then(asserts.equal(false));
  });

  it('should not store int values if not allowed', () => {
    const value = web3.toBigNumber(2).pow(255).sub(1).mul(-1);
    return manager.deny()
    .then(() => asserts.throws(storage.setInt(CRATE, KEY, value)))
    .then(() => storage.getInt(CRATE, KEY))
    .then(asserts.equal(0));
  });

  it('should not store bytes32 values if not allowed', () => {
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return manager.deny()
    .then(() => asserts.throws(storage.setBytes32(CRATE, KEY, value)))
    .then(() => storage.getBytes32(CRATE, KEY))
    .then(asserts.equal(ZERO_BYTES32));
  });
});
