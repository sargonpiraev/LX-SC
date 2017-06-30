const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

contract('StorageManager', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storageManager;
  let multiEventsHistory;
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
    .then(() => StorageManager.deployed())
    .then(instance => storageManager = instance)
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => storageManager.setupEventsHistory(multiEventsHistory.address))
    .then(() => multiEventsHistory.authorize(storageManager.address))
    .then(reverter.snapshot);
  });

  it('should check auth on setup event history', () => {
    const caller = accounts[1];
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      storageManager.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        storageManager.address,
        storageManager.contract.setupEventsHistory.getData().slice(0, 10)
      ), 0)
    )
    .then(() => storageManager.setupEventsHistory(multiEventsHistory.address, {from: caller}))
    .then(assertExpectations());
  });

  it('should not be accessible when empty', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.isAllowed(address, role)
    .then(result => assert.isFalse(result));
  });

  it('should emit AccessGiven event after access is given', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.giveAccess(address, role)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'AccessGiven');
      assert.equal(result.logs[0].args.actor, address);
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should emit AccessBlocked event after access is blocked', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.blockAccess(address, role)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'AccessBlocked');
      assert.equal(result.logs[0].args.actor, address);
      assert.equal(result.logs[0].args.role, role);
    });
  });

  it('should be accessible', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.giveAccess(address, role)
    .then(() => storageManager.isAllowed(address, role))
    .then(result => assert.isTrue(result));
  });

  it('should not be accessible', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.blockAccess(address, role)
    .then(() => storageManager.isAllowed(address, role))
    .then(result => assert.isFalse(result));
  });

  it('should block allowed access', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.giveAccess(address, role)
    .then(() => storageManager.blockAccess(address, role))
    .then(() => storageManager.isAllowed(address, role))
    .then(result => assert.isFalse(result));
  });

  it('should correctly track changes for different addresses', () => {
    const address1 = '0xffffffffffffffffffffffffffffffffffffffff';
    const address2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const address3 = '0xdddddddddddddddddddddddddddddddddddddddd';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return storageManager.giveAccess(address1, role)
    .then(() => storageManager.giveAccess(address2, role))
    .then(() => storageManager.blockAccess(address2, role))
    .then(() => storageManager.giveAccess(address3, role))
    .then(() => storageManager.isAllowed(address1, role))
    .then(result => assert.isTrue(result))
    .then(() => storageManager.isAllowed(address2, role))
    .then(result => assert.isFalse(result))
    .then(() => storageManager.isAllowed(address3, role))
    .then(result => assert.isTrue(result));
  });

  it('should correctly track changes for different roles', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role1 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const role3 = '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
    return storageManager.giveAccess(address, role1)
    .then(() => storageManager.giveAccess(address, role2))
    .then(() => storageManager.blockAccess(address, role2))
    .then(() => storageManager.giveAccess(address, role3))
    .then(() => storageManager.isAllowed(address, role1))
    .then(result => assert.isTrue(result))
    .then(() => storageManager.isAllowed(address, role2))
    .then(result => assert.isFalse(result))
    .then(() => storageManager.isAllowed(address, role3))
    .then(result => assert.isTrue(result));
  });

  it('should not allow access for unset roles', () => {
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role1 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const role2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return storageManager.giveAccess(address, role1)
    .then(() => storageManager.isAllowed(address, role1))
    .then(result => assert.isTrue(result))
    .then(() => storageManager.isAllowed(address, role2))
    .then(result => assert.isFalse(result));
  });

  it('should check auth on giving an access', () => {
    const caller = accounts[1];
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      storageManager.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        storageManager.address,
        storageManager.contract.giveAccess.getData().slice(0, 10)
      ), 0)
    )
    .then(() => storageManager.giveAccess(address, role, {from: caller}))
    .then(assertExpectations())
    .then(() => storageManager.isAllowed(address, role))
    .then(result => assert.isFalse(result));
  });

  it('should check auth on blocking an access', () => {
    const caller = accounts[1];
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => storageManager.giveAccess(address, role))
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      storageManager.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        storageManager.address,
        storageManager.contract.blockAccess.getData().slice(0, 10)
      ), 0)
    )
    .then(() => storageManager.blockAccess(address, role, {from: caller}))
    .then(assertExpectations())
    .then(() => storageManager.isAllowed(address, role))
    .then(result => assert.isTrue(result));
  });

});
