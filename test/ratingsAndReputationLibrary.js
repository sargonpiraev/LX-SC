const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Mock = artifacts.require('./Mock.sol');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const RatingsAndReputationLibrary = artifacts.require('./RatingsAndReputationLibrary.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('RatingsAndReputationLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const SENDER = accounts[1];
  let storage;
  let mock;
  let eventsHistory;
  let ratingsLibrary;

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

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => RatingsAndReputationLibrary.deployed())
    .then(instance => ratingsLibrary = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => UserLibrary.deployed())
    .then(instance => mock = instance)
    .then(() => ratingsLibrary.setupUserLibrary(mock.address))
    .then(() => ratingsLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(ratingsLibrary.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should be able to set valid user rating', () => {
    const rating = 5;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating, {from: SENDER})
    .then(() => ratingsLibrary.getUserRating(SENDER, address))
    .then(asserts.equal(rating));
  });

  it('should not be able to set invalid user rating', () => {
    const rating = 33;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating, {from: SENDER})
    .then(() => ratingsLibrary.getUserRating(SENDER, address))
    .then(asserts.equal(0));
  });

  it('should rewrite user rating', () => {
    const rating1 = 5;
    const rating2 = 6;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setUserRating(address, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getUserRating(SENDER, address))
    .then(asserts.equal(rating2));
  });

   it('should not rewrite to invalid user rating', () => {
    const rating1 = 5;
    const rating2 = 11;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setUserRating(address, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getUserRating(SENDER, address))
    .then(asserts.equal(rating1));
  });

  it('should store user rating for different addresses', () => {
    const rating1 = 5;
    const rating2 = 6;
    const address1 = '0xffffffffffffffffffffffffffffffffffffffff';
    const address2 = '0xffffffffffffffffffffffffffffffffffffff00';
    return ratingsLibrary.setUserRating(address1, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setUserRating(address2, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getUserRating(SENDER, address1))
    .then(asserts.equal(rating1))
    .then(() => ratingsLibrary.getUserRating(SENDER, address2))
    .then(asserts.equal(rating2));
  });

  it('should store user rating from different raters', () => {
    const sender2 = accounts[3];
    const rating1 = 5;
    const rating2 = 6;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setUserRating(address, rating2, {from: sender2}))
    .then(() => ratingsLibrary.getUserRating(SENDER, address))
    .then(asserts.equal(rating1))
    .then(() => ratingsLibrary.getUserRating(sender2, address))
    .then(asserts.equal(rating2));
  });

  it('should emit "UserRatingGiven" event when user rating set', () => {
    const rating = 5;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating, {from: SENDER})
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'UserRatingGiven');
      assert.equal(result.logs[0].args.rater, SENDER);
      assert.equal(result.logs[0].args.to, address);
      assert.equal(result.logs[0].args.rating, rating);
    });
  });

  it('should not emit "UserRatingGiven" event when invalid user rating set', () => {
    const rating = 55;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setUserRating(address, rating, {from: SENDER})
    .then(result => assert.equal(result.logs.length, 0));
  });

  it('should set valid client rating', () => {
    // const rating = 2;
    // const client = '0xffffffffffffffffffffffffffffffffffffffff';
    // const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    // return ratingsLibrary.setUserRatingFor(client, rating, {from: SENDER})
    // .then(result => assert.equal(result.logs.length, 0));
  });
  it('should set valid worker rating', () => {});
  it('should set valid worker area rating', () => {});
  it('should set valid worker category rating', () => {});
  it('should set valid worker skill rating', () => {});
  it('should not set invalid worker rating', () => {});
  it('should not set invalid client rating', () => {});
  it('should not set invalid worker area rating', () => {});
  it('should not set invalid worker category rating', () => {});
  it('should not set invalid worker skill rating', () => {});

});
