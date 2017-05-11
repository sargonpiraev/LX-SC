const Reverter = require('./helpers/reverter');
const UserProxy = artifacts.require('./UserProxy.sol');
const UserProxyTester = artifacts.require('./UserProxyTester.sol');

contract('UserProxy', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let userProxy;
  let tester;

  before('setup', () => {
    return UserProxy.deployed()
    .then(instance => userProxy = instance)
    .then(() => UserProxyTester.deployed())
    .then(instance => tester = instance)
    .then(reverter.snapshot);
  });

  it('should forward calls', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionReturningValue.getData(someParameter);
    return userProxy.forward.call(tester.address, data, 0, false)
      .then(result => assert.equal(result, someParameter));
  })
  
  it('should not forward calls when called by not-owner', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionReturningValue.getData(someParameter);
    return userProxy.forward.call(tester.address, data, 0, false, {from: accounts[1]})
      .then(result => assert.equal(result, 0));
  });

  it('should throw', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.unsuccessfullFunction.getData(someParameter);
    return userProxy.forward(tester.address, data, 0, true)
      .then(assert.fail, () => true);
  });

  it('should emit Forwarded event when forwarded', () => {
    const someParameter = '0x3432000000000000000000000000000000000000000000000000000000000000';
    const data = tester.contract.functionReturningValue.getData(someParameter);
    return userProxy.forward(tester.address, data, 0, false)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, userProxy.address);
      assert.equal(result.logs[0].event, 'Forwarded');
      assert.equal(result.logs[0].args.destination, tester.address);
      assert.equal(result.logs[0].args.value, 0);
      assert.equal(result.logs[0].args.data, data);
    });
  });
});
