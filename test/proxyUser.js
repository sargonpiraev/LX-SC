const Reverter = require('./helpers/reverter');
const ProxyUser = artifacts.require('./ProxyUser.sol');

contract('ProxyUser', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let proxyUser;
  let user;

  before('setup', () => {
    return ProxyUser.deployed()
    .then(instance => proxyUser = instance)
    .then(reverter.snapshot);
  });
});