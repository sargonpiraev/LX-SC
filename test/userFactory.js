const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const UserLibraryMock = artifacts.require('./UserLibraryMock.sol');
const UserFactory = artifacts.require('./UserFactory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

const Asserts = require('./helpers/asserts');
const Reverter = require('./helpers/reverter');

const helpers = require('./helpers/helpers');

contract('UserFactory', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let multiEventsHistory;
  let userFactory;
  let callCounter;
  let recovery = "0xffffffffffffffffffffffffffffffffffffffff";
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

  const ignoreAuth = (enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  };

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => ignoreAuth())
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => UserFactory.deployed())
    .then(instance => userFactory = instance)
    .then(() => multiEventsHistory.authorize(userFactory.address))
    .then(() => userFactory.setupEventsHistory(multiEventsHistory.address))
    .then(() => UserLibraryMock.deployed())
    .then(instance => callCounter = instance)
    .then(() => userFactory.setupUserLibrary(callCounter.address))
    .then(reverter.snapshot);
  });

  it('should check auth on setup event history', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      userFactory.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        userFactory.address,
        userFactory.contract.setupEventsHistory.getData().slice(0, 10)
      ), 0)
    )
    .then(() => userFactory.setupEventsHistory(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setup user library', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      userFactory.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        userFactory.address,
        userFactory.contract.setupUserLibrary.getData().slice(0, 10)
      ), 0)
    )
    .then(() => userFactory.setupUserLibrary(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should create users without skills', () => {
    return userFactory.createUserWithProxyAndRecovery(recovery, '', [], [])
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].args.self, userFactory.address);
      assert.equal(result.logs[0].event, 'UserCreated');
      assert.equal(result.logs[0].args.areas.toString(), '0');
      assert.equal(result.logs[0].args.categories.length, 0);
      assert.equal(result.logs[0].args.skills.length, 0); 
      assert.equal(result.logs[0].args.recoveryContract, recovery);
      assert.isNotNull(result.logs[0].args.proxy);
      assert.isNotNull(result.logs[0].args.users);
    })
    .then(() => callCounter.getCalls())
    .then(array => {
      assert.equal(array[0].toString(), '0');
      assert.equal(array[1].toString(), '0');
    });
  });

  it('should create users with skills', () => {
    let areas = 10;
    let categories = [1, 2];
    let skills = [1];
    return userFactory.createUserWithProxyAndRecovery(recovery, areas, categories, skills)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].args.self, userFactory.address);
      assert.equal(result.logs[0].event, 'UserCreated');
      assert.equal(result.logs[0].args.areas.toString(2), '1010');
      assert.equal(result.logs[0].args.categories.length, 2);
      assert.equal(result.logs[0].args.skills.length, 1);
      assert.equal(result.logs[0].args.recoveryContract, recovery);
      assert.isNotNull(result.logs[0].args.proxy);
      assert.isNotNull(result.logs[0].args.users);
    })
    .then(() => callCounter.getCalls())
    .then(array => {
      assert.equal(array[0].toString(), '0');
      assert.equal(array[1].toString(), '1');
    });
  });

})
