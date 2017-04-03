const Reverter = require('./helpers/reverter');
const ProxyUser = artifacts.require('./ProxyUser.sol');

contract('ProxyUser', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let proxyUser;

  before('setup', () => {
    return ProxyUser.deployed()
    .then(instance => proxyUser = instance)
    .then(reverter.snapshot);
  });

  // it("should allow owner to send transaction", () => {
  //   // Encode the transaction to send to the proxy contract
  //   var data = lightwallet.txutils._encodeFunctionTxData('register', ['uint256'], [LOG_NUMBER_1]);
  //   // Send forward request from the owner
  //   proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).then(() => {
  //     return testReg.registry.call(proxy.address);
  //   }).then((regData) => {
  //     assert.equal(regData.toNumber(), LOG_NUMBER_1)
  //   });
  // });

  // it("should throw if function call fails", () => {
  //   var errorThrown = false;
  //   // Encode the transaction to send to the proxy contract
  //   var data = lightwallet.txutils._encodeFunctionTxData('testThrow', [], []);
  //   proxy.forward(testReg.address, 0, '0x' + data, {from: accounts[0]}).catch((e) => {
  //     errorThrown = true;
  //   }).then(() => {
  //     assert.isTrue(errorThrown, "An error should have been thrown");
  //   })
  // });
});