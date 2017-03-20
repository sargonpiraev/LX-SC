const Reverter = require('./helpers/reverter');

contract('NameHere', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  before('setup', () => {
    return Promise.resolve()
    .then(reverter.snapshot);
  });

  it('should test', () => {
    return Promise.resolve();
  })
});
