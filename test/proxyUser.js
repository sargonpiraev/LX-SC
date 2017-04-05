const Reverter = require('./helpers/reverter');
const ProxyUser = artifacts.require('./ProxyUser.sol');
const ProxyUserTester = artifacts.require('./ProxyUserTester.sol');

contract('ProxyUser', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let proxyUser;
  let tester;

  before('setup', () => {
    return ProxyUser.deployed()
    .then(instance => proxyUser = instance)
    .then(() => ProxyUserTester.deployed())
    .then(instance => tester = instance)
    .then(reverter.snapshot);
  });

  it('should forward calls without return value', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionNotReturningValue.getData(someParameter);
    return proxyUser.forward.call(tester.address, data, 0)
      .then(result => assert.equal(result.length, 0));
  })

  it('should emit Forwarded event when forwarded call without return value', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionNotReturningValue.getData(someParameter);
    return proxyUser.forward(tester.address, data, 0)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, proxyUser.address);
      assert.equal(result.logs[0].event, 'Forwarded');
      assert.equal(result.logs[0].args.destination, tester.address);
      assert.equal(result.logs[0].args.value, 0);
      assert.equal(result.logs[0].args.data, data);
    });
  });

  it('should forward calls with return value', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionReturningValue.getData(someParameter);

    return proxyUser.forwardWithReturn.call(tester.address, data, 0)
      .then(result => assert.equal(result, someParameter));
  })

  it('should emit Forwarded event when forwarded call with return value', () => {
    const someParameter = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const data = tester.contract.functionNotReturningValue.getData(someParameter);
    return proxyUser.forwardWithReturn(tester.address, data, 0)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, proxyUser.address);
      assert.equal(result.logs[0].event, 'Forwarded');
      assert.equal(result.logs[0].args.destination, tester.address);
      assert.equal(result.logs[0].args.value, 0);
      assert.equal(result.logs[0].args.data, data);
    });
  });
});