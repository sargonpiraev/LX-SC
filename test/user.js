const Reverter = require('./helpers/reverter');
const User = artifacts.require('./User.sol');

contract('User', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let user;

  before('setup', () => {
    return User.deployed()
    .then(instance => user = instance)
    .then(reverter.snapshot);
  });

  it("should be able to set valid rating", () => {
    const rating1 = '5';
    const rating2 = '6';
    const rating3 = '7';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    user.setRatingFor(address, rating1)
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating1))
    .then(() => user.setRatingFor(address, rating2))
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating2))
    .then(() => user.setRatingFor(address, rating3))
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating3));
  });

  // it("should not be able to set invalid rating", () => {
  //   const rating = '33';
  //   const address = '0xffffffffffffffffffffffffffffffffffffffff';
  //   user.setRatingFor(address, rating)
  //   .then(() => user.getRatingFor(address))
  //   .then(ratingReceived => assert.equal(ratingReceived.toNumber(), 0));
  // });
});