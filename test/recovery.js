"use strict";

const Mock = artifacts.require('./Mock.sol');
const Recovery = artifacts.require('./Recovery.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const UserMock = artifacts.require('./UserMock.sol');

const Asserts = require('./helpers/asserts');
const Reverter = require('./helpers/reverter');


contract('Recovery', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let recovery;
  let userMock;
  let caller = accounts[1];
  let newUser = '0xffffffffffffffffffffffffffffffffffffffff';
  let prevUser = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let mock;

  const ignoreAuth = (enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  };

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
    .then(() => ignoreAuth())
    .then(() => Recovery.deployed())
    .then(instance => recovery = instance)
    .then(() => UserMock.deployed())
    .then(instance => userMock = instance)
    .then(() => userMock.setContractOwner(prevUser))
    .then(reverter.snapshot);
  });

  it('should check auth on user recovery', () => {
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      recovery.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        recovery.address,
        recovery.contract.recoverUser.getData().slice(0, 10)
      ), 0)
    )
    .then(() => recovery.recoverUser(userMock.address, newUser, {from: caller}))
    .then(assertExpectations());
  });

  it('should recover users', () => {
    return recovery.recoverUser(userMock.address, newUser)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].event, 'UserRecovered');
      assert.equal(result.logs[0].args.prevUser, prevUser);
      assert.equal(result.logs[0].args.newUser, newUser);
      assert.equal(result.logs[0].args.userContract, userMock.address);
      assert.notEqual(result.logs[0].args.newUser, result.logs[0].args.prevUser);
    })
    .then(() => userMock.recoverUserCalls())
    .then(result => assert.equal(result.toString(), '1'));
  });

})
