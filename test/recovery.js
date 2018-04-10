"use strict";

const Mock = artifacts.require('./Mock.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Recovery = artifacts.require('./Recovery.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const UserMock = artifacts.require('./UserMock.sol');

const Asserts = require('./helpers/asserts');
const Reverter = require('./helpers/reverter');
const eventsHelper = require('./helpers/eventsHelper');

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
    .then(() => Recovery.deployed())
    .then(instance => recovery = instance)
    .then(() => UserMock.deployed())
    .then(instance => userMock = instance)
    .then(() => userMock.setContractOwner(prevUser))
    .then(reverter.snapshot);
  });

  it('should check auth on user recovery', () => {
    return Promise.resolve()
    .then(() => recovery.setRoles2Library(mock.address))
    .then(() => mock.expect(
      recovery.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        recovery.address,
        recovery.contract.recoverUser.getData(0, 0).slice(0, 10)
      ), 0)
    )
    .then(() => recovery.recoverUser(userMock.address, newUser, {from: caller}))
    .then(assertExpectations())
    .then(() => recovery.setRoles2Library(Roles2Library.address));
  });

  it('should recover users', () => {
    return recovery.recoverUser(userMock.address, newUser)
    .then(tx => eventsHelper.extractEvents(tx, "UserRecovered"))
    .then(events => {
        assert.equal(events.length, 1);

        let userRecoveredEvent = events[0];
        assert.equal(userRecoveredEvent.event, 'UserRecovered');
        assert.equal(userRecoveredEvent.args.prevUser, prevUser);
        assert.equal(userRecoveredEvent.args.newUser, newUser);
        assert.equal(userRecoveredEvent.args.userContract, userMock.address);
        assert.notEqual(userRecoveredEvent.args.newUser, userRecoveredEvent.args.prevUser);
    })
    .then(() => userMock.recoverUserCalls())
    .then(result => assert.equal(result.toString(), '1'));
  });

})
