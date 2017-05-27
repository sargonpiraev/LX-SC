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
  let userLibrary = web3.eth.contract(UserLibrary.abi).at('0x0');
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
    .then(() => Mock.deployed())
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

  it('should set valid rating', () => {
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'),  true)
    .then(() => ratingsLibrary.setRating(worker, rating, jobId, {from: client}))    
    .then(() => ratingsLibrary.getRating(worker, jobId))
    .then(result => {
      assert.equal(result[1], rating);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  });

  it('should set valid worker area rating', () => {
  });
  it('should set valid worker category rating', () => {});
  it('should set valid worker skill rating', () => {});

  it('should emit "RatingGiven" when valid rating given', () => {
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return ratingsLibrary.setRating(worker, rating, jobId, {from: client})
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RatingGiven');
      assert.equal(result.logs[0].args.rater, client);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      assert.equal(result.logs[0].args.jobId, jobId);
    })
  });

  it('should emit "AreaRatingGiven" when set worker area rating', () => {});
  it('should emit "CategoryRatingGiven" when set worker category rating', () => {});
  it('should emit "SkillRatingGiven" when set worker skill rating', () => {});
  
  it('should not set invalid rating', () => {
    const rating = 100500;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'),  true)
    .then(() => ratingsLibrary.setRating(worker, rating, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))
    .then(() => ratingsLibrary.getRating(worker, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set invalid worker area rating', () => {});
  it('should not set invalid worker category rating', () => {});
  it('should not set invalid worker skill rating', () => {});
  it('should not emit "AreaRatingGiven" when set invalid area rating', () => {});
  it('should not emit "CategoryRatingGiven" when set invalid category rating', () => {});
  it('should not emit "SkillRatingGiven" when set invalid skill rating', () => {});
  it('should not set worker area rating if worker doesn\'t have that area', () => {});
  it('should not set invalid worker category rating if worker doesn\'t have that category', () => {});
  it('should not set invalid worker skill rating if worker doesn\'t have that skill', () => {});
  
  it('should not set rating if doesn\'t have role', () => {
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'),  false)
    .then(() => ratingsLibrary.setRating(worker, rating, jobId, {from: client}))    
    .then(() => ratingsLibrary.getRating(worker, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker area rating if doesn\'t have role', () => {});
  it('should not set worker category rating if doesn\'t have role', () => {});
  it('should not set worker skill rating if doesn\'t have role', () => {});


  it('should store different ratings ', () => {

  })

  //setMany tests


});
