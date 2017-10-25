"use strict";

const ERC20Library = artifacts.require('./ERC20Library.sol');
const Mock = artifacts.require('./Mock.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

const Asserts = require('./helpers/asserts');
const Reverter = require('./helpers/reverter');
const eventsHelper = require('./helpers/eventsHelper');

contract('ERC20Library', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let multiEventsHistory;
  let erc20Library;
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let mock;

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

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => Storage.deployed())
    .then(instance => storage = instance)
    .then(() => ERC20Library.deployed())
    .then(instance => erc20Library = instance)
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(reverter.snapshot);
  });

  it('should add contract', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue);
  });

  it('should not call "addContract" for the same contract twice', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.addContract.call(contract))
    .then(asserts.isFalse);
  });

  it('should emit ContractAdded event in MultiEventsHistory', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(tx => eventsHelper.extractEvents(tx, "ContractAdded"))
    .then(events => {
      assert.equal(events.length, 1);
      assert.equal(events[0].address, multiEventsHistory.address);
      assert.equal(events[0].event, 'ContractAdded');
      assert.equal(events[0].args.contractAddress, contract);
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

  it('should not call "removeContract" for the same contract twice', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.removeContract(contract))
    .then(() => erc20Library.removeContract.call(contract))
    .then(asserts.isFalse);
  });

  it('should emit ContractRemoved event in MultiEventsHistory', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.removeContract(contract))
    .then(tx => eventsHelper.extractEvents(tx, "ContractRemoved"))
    .then(events => {
      assert.equal(events.length, 1);
      assert.equal(events[0].address, multiEventsHistory.address);
      assert.equal(events[0].event, 'ContractRemoved');
      assert.equal(events[0].args.contractAddress, contract);
    });
  });

  it.skip('should not add contract if not allowed', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract, {from: nonOwner}))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isFalse);
  });

  it('should check auth on add contract', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.setRoles2Library(Mock.address))
    .then(() => mock.expect(
      erc20Library.address,
      0,
      roles2LibraryInterface.canCall.getData(
        nonOwner,
        erc20Library.address,
        erc20Library.contract.addContract.getData(contract).slice(0, 10)
      ), 0)
    )
    .then(() => erc20Library.addContract(contract, {from: nonOwner}))
    .then(assertExpectations())
    .then(() => erc20Library.setRoles2Library(Roles2Library.address))
  });

  it.skip('should not remove contract if not allowed', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.removeContract(contract, {from: nonOwner}))
    .then(() => erc20Library.includes(contract))
    .then(asserts.isTrue);
  });

  it('should check auth on remove contract', () => {
    const nonOwner = accounts[2];
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.setRoles2Library(Mock.address))
    .then(() => mock.expect(
      erc20Library.address,
      0,
      roles2LibraryInterface.canCall.getData(
        nonOwner,
        erc20Library.address,
        erc20Library.contract.removeContract.getData(contract).slice(0, 10)
      ), 0)
    )
    .then(() => erc20Library.removeContract(contract, {from: nonOwner}))
    .then(assertExpectations())
    .then(() => erc20Library.setRoles2Library(Roles2Library.address))
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

  it('should correctly add contracts after removing', () => {
    const contract = '0xffffffffffffffffffffffffffffffffffffffff';
    const contract2 = '0xffffffffffffffffffffffffffffffffffffff00';
    const contract3 = '0x00ffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(contract))
    .then(() => erc20Library.addContract(contract2))
    .then(() => erc20Library.getContracts())
    .then(contracts => {
      assert.equal(contracts.length, 2);
      assert.equal(contracts[0], contract);
      assert.equal(contracts[1], contract2);
    })
    .then(() => erc20Library.removeContract(contract2))
    .then(() => erc20Library.addContract(contract3))
    .then(() => erc20Library.getContracts())
    .then(contracts => {
      assert.equal(contracts.length, 2);
      assert.equal(contracts[0], contract);
      assert.equal(contracts[1], contract3);
    });
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
