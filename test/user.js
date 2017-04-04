const Reverter = require('./helpers/reverter');
const User = artifacts.require('./User.sol');

contract('User', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let user;
  const ID = '1';

  before('setup', () => {
    return User.deployed()
    .then(instance => user = instance)
    .then(reverter.snapshot);
  });

  // it("should return id", () => {
  //   return user.getId()
  //   .then(result => assert.equal(result.toNumber(), ID));
  // });

  it("should be able to set valid rating", () => {
    const rating = '5';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating)
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating));
  });

  it("should not be able to set invalid rating", () => {
    const rating = '33';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating)
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => {assert.equal(ratingReceived.toNumber(), '0')});
  });

  it("should rewrite rating", () => {
    const rating1 = '5';
    const rating2 = '6';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating1)
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating1))
    .then(() => user.setRatingFor(address, rating2))
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating2));
  });


   it("should not rewrite to invalid rating", () => {
    const rating1 = '5';
    const rating2 = '11';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating1)
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating1))
    .then(() => user.setRatingFor(address, rating2))
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating1));
  });

  it("should store rating for different addresses", () => {
    const rating1 = '5';
    const rating2 = '6';
    const address1 = '0xffffffffffffffffffffffffffffffffffffffff';
    const address2 = '0xffffffffffffffffffffffffffffffffffffff00';
    return user.setRatingFor(address1, rating1)
    .then(() => user.getRatingFor(address1))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating1))
    .then(() => user.setRatingFor(address2, rating2))
    .then(() => user.getRatingFor(address2))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), rating2));
  });

  it("should not set rating if not owner", () => {
    const rating = '5';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating, {from: accounts[1]})
    .then(() => user.getRatingFor(address))
    .then(ratingReceived => assert.equal(ratingReceived.toNumber(), '0'));
  });
});