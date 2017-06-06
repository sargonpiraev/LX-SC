const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

contract('ERC20Library', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let multiEventsHistory;
  let erc20Library;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => ERC20Library.deployed())
    .then(instance => erc20Library = instance)
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => erc20Library.setupEventsHistory(multiEventsHistory.address))
    .then(() => multiEventsHistory.authorize(erc20Library.address))
    .then(reverter.snapshot);
  });

  it('should add contract', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue);
  });

  it('should emit ContractAdded event in MultiEventsHistory', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'ContractAdded');
      assert.equal(result.logs[0].args.contractAddress, contract);
    });
  });

  it('should not have contract by default', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.includes(contract))
    .then(asserts.isFalse);
  });

  it('should remove contract', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.removeContract(contract))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isFalse);
  });

  it('should emit ContractRemoved event in MultiEventsHistory', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.removeContract(contract))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'ContractRemoved');
      assert.equal(result.logs[0].args.contractAddress, contract);
    });
  });

  it('should not add contract if not allowed', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract, {from: nonOwner}))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isFalse);
  });

  it('should not remove contract if not allowed', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.removeContract(contract, {from: nonOwner}))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue);
  });

  it('should add several contracts', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    const contract2 = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.addContract(contract2))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue)
    .then(() => erc20Library.includes(contract2))
    .then(asserts.isTrue);
  });

  it('should differentiate contracts', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    const contract2 = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue)
    .then(() => erc20Library.includes(contract2))
    .then(asserts.isFalse);
  });

  it('should return all contracts', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    const contract2 = '0xffffffffffffffffffffffffffffffffffffff00';
    const contract3 = '0x00ffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.addContract(contract2))
    .then(() => erc20Library.addContract(contract3))
    .then(() => erc20Library.getContracts())
    .then(contracts => {
      assert.equal(contracts.length, 3);
      assert.equal(contracts[0], contract);
      assert.equal(contracts[1], contract2);
      assert.equal(contracts[2], contract3);
    })
    .then(() => erc20Library.removeContract(contract2))
    .then(() => erc20Library.getContracts())
    .then(contracts => {
      assert.equal(contracts.length, 2);
      assert.equal(contracts[0], contract);
      assert.equal(contracts[1], contract3);
    });
  });

  it('should not duplicate contracts', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.getContracts())
    .then(contracts => {
      assert.equal(contracts.length, 1);
      assert.equal(contracts[0], contract);
    });
  });
});
