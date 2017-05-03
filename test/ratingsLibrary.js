const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const RatingsLibrary = artifacts.require('./RatingsLibrary.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('RatingsLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const SENDER = accounts[1];
  let storage;
  let eventsHistory;
  let ratingsLibrary;

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => RatingsLibrary.deployed())
    .then(instance => ratingsLibrary = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => ratingsLibrary.setupEventsHistory(eventsHistory.address))
    .then(() => eventsHistory.addVersion(ratingsLibrary.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should be able to set valid rating', () => {
    const rating = 5;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating, {from: SENDER})
    .then(() => ratingsLibrary.getRating(SENDER, address))
    .then(asserts.equal(rating));
  });

  it('should not be able to set invalid rating', () => {
    const rating = 33;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating, {from: SENDER})
    .then(() => ratingsLibrary.getRating(SENDER, address))
    .then(asserts.equal(0));
  });

  it('should rewrite rating', () => {
    const rating1 = 5;
    const rating2 = 6;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setRatingFor(address, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getRating(SENDER, address))
    .then(asserts.equal(rating2));
  });

   it('should not rewrite to invalid rating', () => {
    const rating1 = 5;
    const rating2 = 11;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setRatingFor(address, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getRating(SENDER, address))
    .then(asserts.equal(rating1));
  });

  it('should store rating for different addresses', () => {
    const rating1 = 5;
    const rating2 = 6;
    const address1 = '0xffffffffffffffffffffffffffffffffffffffff';
    const address2 = '0xffffffffffffffffffffffffffffffffffffff00';
    return ratingsLibrary.setRatingFor(address1, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setRatingFor(address2, rating2, {from: SENDER}))
    .then(() => ratingsLibrary.getRating(SENDER, address1))
    .then(asserts.equal(rating1))
    .then(() => ratingsLibrary.getRating(SENDER, address2))
    .then(asserts.equal(rating2));
  });

  it('should store rating from different raters', () => {
    const sender2 = accounts[3];
    const rating1 = 5;
    const rating2 = 6;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating1, {from: SENDER})
    .then(() => ratingsLibrary.setRatingFor(address, rating2, {from: sender2}))
    .then(() => ratingsLibrary.getRating(SENDER, address))
    .then(asserts.equal(rating1))
    .then(() => ratingsLibrary.getRating(sender2, address))
    .then(asserts.equal(rating2));
  });

  it('should emit "RatingGiven" event when rating set', () => {
    const rating = 5;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating, {from: SENDER})
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RatingGiven');
      assert.equal(result.logs[0].args.rater, SENDER);
      assert.equal(result.logs[0].args.to, address);
      assert.equal(result.logs[0].args.rating, rating);
    });
  });

  it('should not emit "RatingGiven" event when invalid rating set', () => {
    const rating = 55;
    const address = '0xffffffffffffffffffffffffffffffffffffffff';
    return ratingsLibrary.setRatingFor(address, rating, {from: SENDER})
    .then(result => assert.equal(result.logs.length, 0));
  });
});
