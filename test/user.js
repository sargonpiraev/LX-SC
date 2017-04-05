const EventsHistory = artifacts.require('./EventsHistory.sol');
const Reverter = require('./helpers/reverter');
const User = artifacts.require('./User.sol');

contract('User', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let user;
  let eventsHistory;
  const DEFAULT_BYTES32_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000000';

  before('setup', () => {
    return User.deployed()
    .then(instance => user = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => user.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(user.address, '_', '_'))
    .then(reverter.snapshot);
  });

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

  it("should be able to set hash", () => {
    const key = 'UserInfo';
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return user.setHashFor(key, hash)
    .then(() => user.getHashFor(key))
    .then(hashReceived => assert.equal(hashReceived, hash));
  });

  it("should be able to change hash", () => {
    const key = 'UserInfo';
    const hash1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const hash2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return user.setHashFor(key, hash1)
    .then(() => user.getHashFor(key))
    .then(hashReceived => assert.equal(hashReceived, hash1))
    .then(() => user.setHashFor(key, hash2))
    .then(() => user.getHashFor(key))
    .then(hashReceived => assert.equal(hashReceived, hash2));
  });

  it("should not be able to change hash if not owner", () => {
    const key = 'UserInfo';
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return user.setHashFor(key, hash, {from: accounts[1]})
    .then(() => user.getHashFor(key))
    .then(hashReceived => assert.equal(hashReceived, DEFAULT_BYTES32_VALUE));
  });

  it("should be able to store different hashes", () => {
    const key1 = 'UserInfo';
    const key2 = 'UserPhoto';
    const hash1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const hash2 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return user.setHashFor(key1, hash1)
    .then(() => user.getHashFor(key1))
    .then(hashReceived => assert.equal(hashReceived, hash1))
    .then(() => user.setHashFor(key2, hash2))
    .then(() => user.getHashFor(key2))
    .then(hashReceived => assert.equal(hashReceived, hash2));
  });

  it('should emit "RatingGiven" event when rating set', () => {
    const rating = '5';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RatingGiven');
      assert.equal(result.logs[0].args.to, address);
      assert.equal(result.logs[0].args.rating, rating);
    });
  });

  it('should not emit "RatingGiven" event when invalid rating set', () => {
    const rating = '55';
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return user.setRatingFor(address, rating)
    .then(result => assert.equal(result.logs.length, 0));
  });

  it('should emit "HashAdded" event when hash added', () => {
    const key = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const hash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return user.setHashFor(key, hash)
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'HashAdded');
      assert.equal(result.logs[0].args.key, key);
      assert.equal(result.logs[0].args.hash, hash);
    });
  });
});