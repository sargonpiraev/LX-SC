const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Promise = require('bluebird');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

const JobController = artifacts.require('./JobController.sol');

contract('JobController', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let jobController;
  let multiEventsHistory;
  let mock;
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');

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
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => JobController.deployed())
    .then(instance => jobController = instance)
    .then(() => jobController.setupEventsHistory(multiEventsHistory.address))
    .then(() => multiEventsHistory.authorize(jobController.address))
    .then(() => jobController.setPaymentProcessor(mock.address))
    .then(() => jobController.setUserLibrary(mock.address))
    .then(reverter.snapshot);
  });

  it('should check auth on setup event history', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setupEventsHistory.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setupEventsHistory(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting a payment processor', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setPaymentProcessor.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setPaymentProcessor(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting a user library', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setUserLibrary.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setUserLibrary(newAddress, {from: caller}))
    .then(assertExpectations());
  });
});
