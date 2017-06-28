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

  const getFlag = index => {
    return web3.toBigNumber(2).pow(index*2);
  };

  const getEvenFlag = index => {
    return web3.toBigNumber(2).pow(index*2 + 1);
  };

  const equal = (a, b) => {
    return a.valueOf() === b.valueOf();
  };

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
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'RatingGiven');
      assert.equal(result.logs[0].args.rater, client);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      assert.equal(result.logs[0].args.jobId, jobId);
    })
    .then(() => ratingsLibrary.getRating(worker, jobId))
    .then(result => {
      assert.equal(result[1], rating);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  });

  it('should set valid worker area rating', () => {
    const area = getFlag(3);
    const rating = 7;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'AreaRatingGiven');
      assert.equal(result.logs[0].args.rater, client);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      assert.equal(result.logs[0].args.jobId, jobId);
      equal(result.logs[0].args.area, area);
    })    
    .then(() => ratingsLibrary.getAreaRating(worker, area, jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), rating);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  });

  it('should set valid worker area evaluation ', () => {
    const area = getFlag(3);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))    
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'AreaEvaluated');
      assert.equal(result.logs[0].args.rater, evaluator);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      equal(result.logs[0].args.area, area);
    })    
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), rating))
    .then(assertExpectations);
  });

  it('should set valid worker category rating', () => {
    const area = getFlag(2);
    const category = getFlag(3);
    const rating = 7;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'CategoryRatingGiven');
      assert.equal(result.logs[0].args.rater, client);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      assert.equal(result.logs[0].args.jobId, jobId);
      equal(result.logs[0].args.area, area);
      equal(result.logs[0].args.category, category);
    })    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), rating);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  });

  it('should set valid worker category evaluation ', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))    
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'CategoryEvaluated');
      assert.equal(result.logs[0].args.rater, evaluator);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      equal(result.logs[0].args.area, area);
      equal(result.logs[0].args.category, category);
    })    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), rating))
    .then(assertExpectations);
  });

  it('should set valid worker skill rating', () => {
    const area = getFlag(1);
    const category = getFlag(2);
    const skill = getFlag(3);
    const rating = 7;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 100500;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.setSkillRating(worker, rating, area, category, skill, jobId, {from: client}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'SkillRatingGiven');
      assert.equal(result.logs[0].args.rater, client);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      assert.equal(result.logs[0].args.jobId, jobId);
      equal(result.logs[0].args.area, area);
      equal(result.logs[0].args.category, category);
      equal(result.logs[0].args.skill, skill);
    })    
    .then(() => ratingsLibrary.getSkillRating(worker, area, category, skill, jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), rating);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  });

  it('should set valid worker skill evaluation ', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const skill = getFlag(9);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))    
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].event, 'SkillEvaluated');
      assert.equal(result.logs[0].args.rater, evaluator);
      assert.equal(result.logs[0].args.to, worker);
      assert.equal(result.logs[0].args.rating, rating);
      equal(result.logs[0].args.area, area);
      equal(result.logs[0].args.category, category);
      equal(result.logs[0].args.skill, skill);
    })    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), rating))
    .then(assertExpectations);
  });
  
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

  it('should not set invalid worker area rating', () => {
    const area = getFlag(4);
    const rating = 25;
    const client = accounts[2];
    const jobId = 1039383;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaRating(worker, area, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set invalid worker category rating', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 100500;
    const client = accounts[2];
    const jobId = 199;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set invalid worker skill rating', () => {
    const area = getFlag(3);
    const category = getFlag(2);
    const skill = getFlag(1);
    const rating = 100500;
    const client = accounts[2];
    const jobId = 9874234;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set invalid worker area evaluation', () => {
    const area = getFlag(4);
    const rating = 823847;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });
  
  it('should not set invalid worker category evaluation', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 823847;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should not set invalid worker skill evaluation', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const skill = getFlag(9);
    const rating = 823847;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });
 
  it('should not set worker area rating if worker doesn\'t have that area', () => {
    const area = getFlag(4);
    const rating = 1;
    const client = accounts[2];
    const jobId = 345234;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  false))
    .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaRating(worker, area, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker category rating if worker doesn\'t have that category', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 0;
    const client = accounts[2];
    const jobId = 199;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  false))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker skill rating if worker doesn\'t have that skill', () => {
    const area = getFlag(3);
    const category = getFlag(2);
    const skill = getFlag(1);
    const rating = 1;
    const client = accounts[2];
    const jobId = 9874234;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  false))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker area evaluation if worker doesn\'t have that area', () => {
    const area = getFlag(4);
    const rating = 3;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  false))
    .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should not set worker category evaluation if worker doesn\'t have that category', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 4;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  false))
    .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should not set worker skill evaluation if worker doesn\'t have that skill', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const skill = getFlag(9);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  false))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });
  
  it('should not set rating if doesn\'t have role', () => {
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 12245;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'),  false)
    .then(() => ratingsLibrary.setRating(worker, rating, jobId, {from: client}))    
    .then(() => ratingsLibrary.getRating(worker, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker area rating if doesn\'t have role', () => {
    const area = getFlag(4);
    const rating = 1;
    const client = accounts[2];
    const jobId = 1039383;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaRating(worker, area, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker category rating if doesn\'t have role', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 2;
    const client = accounts[2];
    const jobId = 234345;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker skill rating if doesn\'t have role', () => {
    const area = getFlag(3);
    const category = getFlag(2);
    const skill = getFlag(1);
    const rating = 10;
    const client = accounts[2];
    const jobId = 9874234;
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  });

  it('should not set worker area evaluation if doesn\'t have role', () => {
    const area = getFlag(4);
    const rating = 7;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
    .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should not set worker category evaluation if doesn\'t have role', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 5;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should not set worker skill evaluation if doesn\'t have role', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const skill = getFlag(9);
    const rating = 4;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))    
    .then(result => assert.equal(result.logs.length, 0))    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  });

  it('should store different ratings', () => {
    const rating1 = 1;
    const rating2 = 2;
    const rating3 = 3;
    const client1 = accounts[2];
    const client2 = accounts[3];
    const worker1 = '0xeeeeeffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const worker2 = accounts[4];
    const jobId1 = 10;
    const jobId2 = 20;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client1, 'simpleRater'),  true)
    .then(() => ratingsLibrary.setRating(worker1, rating1, jobId1, {from: client1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client2, 'simpleRater'),  true))
    .then(() => ratingsLibrary.setRating(worker2, rating2, jobId2, {from: client2}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(worker2, 'simpleRater'),  true))
    .then(() => ratingsLibrary.setRating(client2, rating3, jobId2, {from: worker2}))
    .then(() => ratingsLibrary.getRating(worker1, jobId1))
    .then(result => {
      assert.equal(result[1], rating1);
      assert.equal(result[0], client1);
    })
    .then(() => ratingsLibrary.getRating(worker2, jobId2))
    .then(result => {
      assert.equal(result[1], rating2);
      assert.equal(result[0], client2);
    })
    .then(() => ratingsLibrary.getRating(client2, jobId2))
    .then(result => {
      assert.equal(result[1], rating3);
      assert.equal(result[0], worker2);
    })
    .then(assertExpectations);
  })

  it('should store different area ratings', () => {
    const area1 = getFlag(1);
    const area2 = getFlag(2);
    const rating1 = 1;
    const rating2 = 2;
    const client1 = accounts[2];
    const client2 = accounts[3];
    const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
    const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
    const jobId1 = 100501;
    const jobId2 = 100502;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client1, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker1, area1),  true))
    .then(() => ratingsLibrary.setAreaRating(worker1, rating1, area1, jobId1, {from: client1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client2, 'simpleRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2),  true))
    .then(() => ratingsLibrary.setAreaRating(worker2, rating2, area2, jobId2, {from: client2}))
    .then(() => ratingsLibrary.getAreaRating(worker1, area1, jobId1))
    .then(result => {
      assert.equal(result[1], rating1);
      assert.equal(result[0], client1);
    })
    .then(() => ratingsLibrary.getAreaRating(worker2, area2, jobId2))
    .then(result => {
      assert.equal(result[1], rating2);
      assert.equal(result[0], client2);
    })
    .then(assertExpectations);
  })

  it('should store different category ratings', () => {
    const area1 = getFlag(1);
    const category1 = getFlag(1);
    const area2 = getFlag(2);
    const category2 = getFlag(2);
    const rating1 = 1;
    const rating2 = 2;
    const client1 = accounts[2];
    const client2 = accounts[3];
    const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
    const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
    const jobId1 = 100501;
    const jobId2 = 100502;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client1, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker1, area1, category1),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker1, rating1, area1, category1, jobId1, {from: client1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client2, 'simpleRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker2, area2),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker2, rating2, area2, category2, jobId2, {from: client2}))
    .then(() => ratingsLibrary.getCategoryRating(worker1, area1, category1, jobId1))
    .then(result => {
      assert.equal(result[1], rating1);
      assert.equal(result[0], client1);
    })
    .then(() => ratingsLibrary.getCategoryRating(worker2, area2, category2, jobId2))
    .then(result => {
      assert.equal(result[1], rating2);
      assert.equal(result[0], client2);
    })
    .then(assertExpectations);
  })

  it('should store different skill ratings', () => {
    const area1 = getFlag(1);
    const category1 = getFlag(1);
    const skill1 = getFlag(2);
    const area2 = getFlag(2);
    const category2 = getFlag(2);
    const skill2 = getFlag(2);
    const rating1 = 1;
    const rating2 = 2;
    const client1 = accounts[2];
    const client2 = accounts[3];
    const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
    const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
    const jobId1 = 100501;
    const jobId2 = 100502;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client1, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker1, area1, category1, skill1),  true))
    .then(() => ratingsLibrary.setSkillRating(worker1, rating1, area1, category1, skill1, jobId1, {from: client1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client2, 'simpleRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2, category2, skill2),  true))
    .then(() => ratingsLibrary.setSkillRating(worker2, rating2, area2, category2, skill2, jobId2, {from: client2}))
    .then(() => ratingsLibrary.getSkillRating(worker1, area1, category1, skill1, jobId1))
    .then(result => {
      assert.equal(result[1], rating1);
      assert.equal(result[0], client1);
    })
    .then(() => ratingsLibrary.getSkillRating(worker2, area2, category2, skill2, jobId2))
    .then(result => {
      assert.equal(result[1], rating2);
      assert.equal(result[0], client2);
    })
    .then(assertExpectations);
  })

  it('should store different area evaluations', () => {
    const area1 = getFlag(1);
    const area2 = getFlag(2);
    const rating1 = 8;
    const rating2 = 9;
    const evaluator1 = accounts[2];
    const evaluator2 = accounts[3];
    const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator1, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker1, area1),  true))
    .then(() => ratingsLibrary.evaluateArea(worker1, rating1, area1, {from: evaluator1}))    
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator2, 'skillRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2),  true))
    .then(() => ratingsLibrary.evaluateArea(worker2, rating2, area2, {from: evaluator2}))    
    .then(() => ratingsLibrary.getAreaEvaluation(worker1, area1, evaluator1))
    .then(result => assert.equal(result.valueOf(), rating1))
    .then(() => ratingsLibrary.getAreaEvaluation(worker2, area2, evaluator2))
    .then(result => assert.equal(result.valueOf(), rating2))
    .then(assertExpectations);
  })

  it('should store different category evaluations', () => {
    const area1 = getFlag(1);
    const category1 = getFlag(1);
    const area2 = getFlag(2);
    const category2 = getFlag(2);
    const rating1 = 8;
    const rating2 = 9;
    const evaluator1 = accounts[2];
    const evaluator2 = accounts[3];
    const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator1, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker1, area1, category1),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker1, rating1, area1, category1, {from: evaluator1}))    
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator2, 'skillRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker2, area2, category2),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker2, rating2, area2, category2, {from: evaluator2}))    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker1, area1, category1, evaluator1))
    .then(result => assert.equal(result.valueOf(), rating1))
    .then(() => ratingsLibrary.getCategoryEvaluation(worker2, area2, category2, evaluator2))
    .then(result => assert.equal(result.valueOf(), rating2))
    .then(assertExpectations);
  })

  it('should store different skill evaluations', () => {
    const area1 = getFlag(1);
    const category1 = getFlag(1);
    const skill1 = getFlag(1);
    const area2 = getFlag(2);
    const category2 = getFlag(2);
    const skill2 = getFlag(2);
    const rating1 = 8;
    const rating2 = 9;
    const evaluator1 = accounts[2];
    const evaluator2 = accounts[3];
    const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator1, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker1, area1, category1, skill1),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker1, rating1, area1, category1, skill1, {from: evaluator1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator2, 'skillRater'), true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker2, area2, category2, skill2),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker2, rating2, area2, category2, skill2, {from: evaluator2}))
    .then(() => ratingsLibrary.getSkillEvaluation(worker1, area1, category1, skill1, evaluator1))
    .then(result => assert.equal(result.valueOf(), rating1))
    .then(() => ratingsLibrary.getSkillEvaluation(worker2, area2, category2, skill2, evaluator2))
    .then(result => assert.equal(result.valueOf(), rating2))
    .then(assertExpectations);
  })

  it('should not have area rating set when category rating set', () => {
    const area = getFlag(1);
    const category = getFlag(2);
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
    const jobId = 234534;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, jobId))
    .then(result => {
      assert.equal(result[1], rating);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getAreaRating(worker, area, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  })

  it('should not have category and area rating set when skill rating set', () => {
    const area = getFlag(1);
    const category = getFlag(2);
    const skill = getFlag(2);
    const rating = 2;
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
    const jobId = 234534;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.setSkillRating(worker, rating, area, category, skill, jobId, {from: client}))
    .then(() => ratingsLibrary.getSkillRating(worker, area, category, skill, jobId))
    .then(result => {
      assert.equal(result[1], rating);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getCategoryRating(worker, area, category, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(() => ratingsLibrary.getAreaRating(worker, area, jobId))
    .then(result => {
      assert.equal(result[1], 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  })

  it('should not have area evaluation set when category evaluation set', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
    .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))    
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), rating))
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  })

  it('should not have category and area evaluation set when skill evaluation set', () => {
    const area = getFlag(4);
    const category = getFlag(7);
    const skill = getFlag(9);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(evaluator, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), rating))
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  })

  it('should set many rates', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  true))
    .then(() => ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client}))    
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(7), getFlag(9), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), ratings[0]);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getCategoryRating(worker, getFlag(4), getFlag(9), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), ratings[1]);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(10), getFlag(12), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), ratings[2]);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23)), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), ratings[3]);
      assert.equal(result[0], client);
    })
    .then(() => ratingsLibrary.getAreaRating(worker, getFlag(5), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), ratings[4]);
      assert.equal(result[0], client);
    })
    .then(assertExpectations);
  })

  it('should not set many rates if doesn\'t have role', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  true))
    .then(() => ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client}))    
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(7), getFlag(9), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), 0);
      assert.equal(result[0], 0);
    })
    .then(() => ratingsLibrary.getCategoryRating(worker, getFlag(4), getFlag(9), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), 0);
      assert.equal(result[0], 0);
    })
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(10), getFlag(12), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), 0);
      assert.equal(result[0], 0);
    })
    .then(() => ratingsLibrary.getSkillRating(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23)), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), 0);
      assert.equal(result[0], 0);
    })
    .then(() => ratingsLibrary.getAreaRating(worker, getFlag(5), jobId))
    .then(result => {
      assert.equal(result[1].valueOf(), 0);
      assert.equal(result[0], 0);
    })
    .then(assertExpectations);
  })

  it('should not set many rates if doesn\'t have at least one of listed areas/categories/skills', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'simpleRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  false))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  true))
    .then(() => asserts.throws(ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client})))
    .then(assertExpectations);
  })

  it('should set many evaluations', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  true))
    .then(() => ratingsLibrary.evaluateMany(worker, areas, categories, skills, ratings, {from: client}))    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(7), getFlag(9), client))
    .then(result => assert.equal(result.valueOf(), ratings[0]))
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, getFlag(4), getFlag(9), client))
    .then(result => assert.equal(result.valueOf(), ratings[1]))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(10), getFlag(12), client))
    .then(result => assert.equal(result.valueOf(), ratings[2]))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23)), client))
    .then(result => assert.equal(result.valueOf(), ratings[3]))
    .then(() => ratingsLibrary.getAreaEvaluation(worker, getFlag(5), client))
    .then(result => assert.equal(result.valueOf(), ratings[4]))
    .then(assertExpectations);
  })

  it('should not set many evaluations if doesn\'t have role', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'skillRater'), false)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  true))
    .then(() => ratingsLibrary.evaluateMany(worker, areas, categories, skills, ratings, {from: client}))    
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(7), getFlag(9), client))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => ratingsLibrary.getCategoryEvaluation(worker, getFlag(4), getFlag(9), client))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(10), getFlag(12), client))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23)), client))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => ratingsLibrary.getAreaEvaluation(worker, getFlag(5), client))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(assertExpectations);
  })

  it('should not set many evaluations if doesn\'t have at least one of listed areas/categories/skills', () => {
    const areas = getFlag(4).add(getEvenFlag(5)).add(getFlag(5));
    const categories = [getFlag(7).add(getEvenFlag(9)).add(getFlag(9)).add(getFlag(10)).add(getFlag(25))];
    const skills = [getFlag(9), getFlag(12), getFlag(13).add(getEvenFlag(23))];
    const ratings = [9, 8, 7, 6, 5];
    const client = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const jobId = 10;
    return mock.expect(ratingsLibrary.address, 0, userLibrary.hasRole.getData(client, 'skillRater'), true)
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(7), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, getFlag(4), getFlag(9)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(10), getFlag(12)),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, getFlag(4), getFlag(25), getFlag(13).add(getEvenFlag(23))),  true))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, getFlag(5)),  false))
    .then(() => asserts.throws(ratingsLibrary.evaluateMany(worker, areas, categories, skills, ratings, {from: client})))   
    .then(assertExpectations);
  })

  //Here should be more test for cheking jobId

});
