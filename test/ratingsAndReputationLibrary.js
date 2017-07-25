"use strict";

const FakeCoin = artifacts.require('./FakeCoin.sol');
const JobController = artifacts.require('./JobController.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const Mock = artifacts.require('./Mock.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const RatingsAndReputationLibrary = artifacts.require('./RatingsAndReputationLibrary.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Storage = artifacts.require('./Storage.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const UserFactory = artifacts.require('./UserFactory.sol');


const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');


const Asserts = require('./helpers/asserts');
const Promise = require('bluebird');
const Reverter = require('./helpers/reverter');

const helpers = require('./helpers/helpers');

contract('RatingsAndReputationLibrary', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);

  const client = accounts[1];
  const worker = accounts[2];

  const SENDER = accounts[1];
  let fakeCoin;
  let storage;
  let mock;
  let jobController;
  let multiEventsHistory;
  let paymentGateway;
  let userLibrary = web3.eth.contract(UserLibrary.abi).at('0x0');
  let ratingsLibrary;
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let userFactory;

  let balanceHolder;
  let paymentProcessor;
  let erc20Library;

  const equal = (a, b) => {
    return a.valueOf() === b.valueOf();
  };

  const p = (...data) => {
    console.log(...data);
  }

  const setupJob = (_jobArea, _jobCategory, _jobSkills) => {
    let jobId;
    const jobArea = helpers.getFlag(_jobArea);
    const jobCategory = helpers.getFlag(_jobCategory);
    const jobSkills = _jobSkills;  // uint

    const roles = [];
    const recovery = "0xffffffffffffffffffffffffffffffffffffffff";

    return Promise.resolve()
      .then(() => userFactory.createUserWithProxyAndRecovery(
        worker, recovery, roles, jobArea, [jobCategory], [jobSkills]
      ))
      .then(() => jobController.postJob(
        jobArea, jobCategory, jobSkills, "Job details", {from: client}
      ))
      .then(result => jobId = result.logs[0].args.jobId)
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, 100, 100, 100, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobId);
  }

  const finishJob = (jobId) => {
    return Promise.resolve()
      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => jobController.confirmStartWork(jobId, {from: client}))
      .then(() => jobController.endWork(jobId, {from: worker}))
      .then(() => jobController.confirmEndWork(jobId, {from: client}))
      .then(() => jobController.releasePayment(jobId))
      .then(tx => helpers.eventEquals(tx, 'PaymentReleased'))
      .then(() => jobId);
  }

  const rateJob = (jobId, _rateArea, _rateCategory, _rateSkills, _ratings) => {
    return Promise.resolve()
      .then(() => ratingsLibrary.rateWorkerSkills(
        jobId, worker, _rateArea, _rateCategory, _rateSkills, _ratings, {from: client}
      ));
  }


  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => helpers.ignoreAuth(mock))
    .then(() => FakeCoin.deployed())
    .then(instance => fakeCoin = instance)
    .then(() => Storage.deployed())
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => ERC20Library.deployed())
    .then(instance => erc20Library = instance)
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => JobController.deployed())
    .then(instance => jobController = instance)
    .then(() => UserFactory.deployed())
    .then(instance => userFactory = instance)
    .then(() => BalanceHolder.deployed())
    .then(instance => balanceHolder = instance)
    .then(() => PaymentGateway.deployed())
    .then(instance => paymentGateway = instance)
    .then(() => PaymentProcessor.deployed())
    .then(instance => paymentProcessor = instance)
    .then(() => RatingsAndReputationLibrary.deployed())
    .then(instance => ratingsLibrary = instance)

    .then(() => multiEventsHistory.authorize(erc20Library.address))
    .then(() => multiEventsHistory.authorize(jobController.address))
    .then(() => multiEventsHistory.authorize(ratingsLibrary.address))
    .then(() => multiEventsHistory.authorize(userFactory.address))
    .then(() => multiEventsHistory.authorize(paymentGateway.address))

    .then(() => erc20Library.setupEventsHistory(multiEventsHistory.address))
    .then(() => userFactory.setupEventsHistory(multiEventsHistory.address))
    .then(() => paymentGateway.setupEventsHistory(multiEventsHistory.address))
    .then(() => jobController.setupEventsHistory(multiEventsHistory.address))
    .then(() => ratingsLibrary.setupEventsHistory(multiEventsHistory.address))

    .then(() => erc20Library.addContract(fakeCoin.address))
    .then(() => paymentGateway.setBalanceHolder(balanceHolder.address))
    .then(() => paymentProcessor.setPaymentGateway(paymentGateway.address))

    .then(() => userFactory.setUserLibrary(mock.address))
    .then(() => jobController.setUserLibrary(mock.address))
    .then(() => jobController.setPaymentProcessor(paymentProcessor.address))

    .then(() => ratingsLibrary.setJobController(jobController.address))
    .then(() => ratingsLibrary.setUserLibrary(mock.address))

    .then(() => fakeCoin.mint(client, '0xfffffffffffffffffff'))
    .then(() => paymentGateway.deposit(
      '0xfffffffffffffffffff', fakeCoin.address, {from: client})
    )
    .then(() => setupJob(1, 1, 7))
    .then(jobId => finishJob(jobId))  // jobId#1, to test finished jobs
    .then(() => setupJob(1, 1, 7))  // jobId#2, to test canceled jobs

    .then(() => mock.resetCallsCount())
    .then(reverter.snapshot);
  });


  describe('Contract setup', () => {

    it('should check auth on setup events history', () => {
      const caller = accounts[1];
      const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
        .then(() => helpers.ignoreAuth(mock, false))
        .then(() => mock.expect(
          ratingsLibrary.address,
          0,
          roles2LibraryInterface.canCall.getData(
            caller,
            ratingsLibrary.address,
            ratingsLibrary.contract.setupEventsHistory.getData().slice(0, 10)
          ), 0)
        )
        .then(() => ratingsLibrary.setupEventsHistory(newAddress, {from: caller}))
        .then(helpers.assertExpectations(mock));
    });

    it('should check auth on setup user library', () => {
      const caller = accounts[1];
      const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
        .then(() => helpers.ignoreAuth(mock, false))
        .then(() => mock.expect(
          ratingsLibrary.address,
          0,
          roles2LibraryInterface.canCall.getData(
            caller,
            ratingsLibrary.address,
            ratingsLibrary.contract.setUserLibrary.getData().slice(0, 10)
          ), 0)
        )
        .then(() => ratingsLibrary.setUserLibrary(newAddress, {from: caller}))
        .then(helpers.assertExpectations(mock));
    });

    it('should check auth on setup job controller', () => {
      const caller = accounts[1];
      const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      return Promise.resolve()
        .then(() => helpers.ignoreAuth(mock, false))
        .then(() => mock.expect(
          ratingsLibrary.address,
          0,
          roles2LibraryInterface.canCall.getData(
            caller,
            ratingsLibrary.address,
            ratingsLibrary.contract.setJobController.getData().slice(0, 10)
          ), 0)
        )
        .then(() => ratingsLibrary.setJobController(newAddress, {from: caller}))
        .then(helpers.assertExpectations(mock));
    });

  });


  describe('User rating', () => {
    it('should not be able to set invalid user rating', () => {
      const rating = -3;
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
          assert.equal(result.logs[0].address, multiEventsHistory.address);
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
  });


  describe('Job rating', () => {

    it("should NOT allow to rate a job if it's not at FINALIZED state");  // TODO

    it("should NOT allow to rate a job if already rated");  // TODO

    it("should not rate non-existent job");  // TODO

    it('should NOT set invalid job rating', () => {
      const rating = 100500;
      const jobId = 1;
      return ratingsLibrary.setJobRating(worker, rating, jobId, {from: client})
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getJobRating(worker, jobId))
      .then(result => {
        assert.equal(result[1], 0);
        assert.equal(result[0], 0);
      })
      .then(() => helpers.assertExpectations(mock));
    });

    it('should set valid job rating', () => {
      const rating = 2;
      const jobId = 1;
      return ratingsLibrary.setJobRating(worker, rating, jobId, {from: client})
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, multiEventsHistory.address);
          assert.equal(result.logs[0].event, 'RatingGiven');
          assert.equal(result.logs[0].args.rater, client);
          assert.equal(result.logs[0].args.to, worker);
          assert.equal(result.logs[0].args.rating, rating);
          assert.equal(result.logs[0].args.jobId, jobId);
        })
        .then(() => ratingsLibrary.getJobRating(worker, jobId))
        .then(result => {
          assert.equal(result[1], rating);
          assert.equal(result[0], client);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    // FIXME
    it.skip('should store different job ratings', () => {
      const rating1 = 1;
      const rating2 = 2;
      const rating3 = 3;
      const client1 = accounts[2];
      const client2 = accounts[3];
      const worker1 = '0xeeeeeffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const worker2 = accounts[4];
      const jobId1 = 10;
      const jobId2 = 20;
      return ratingsLibrary.setJobRating(worker1, rating1, jobId1, {from: client1})
      .then(() => ratingsLibrary.setJobRating(worker2, rating2, jobId2, {from: client2}))
      .then(() => ratingsLibrary.setJobRating(client2, rating3, jobId2, {from: worker2}))
      .then(() => ratingsLibrary.getJobRating(worker1, jobId1))
      .then(result => {
        assert.equal(result[1], rating1);
        assert.equal(result[0], client1);
      })
      .then(() => ratingsLibrary.getJobRating(worker2, jobId2))
      .then(result => {
        assert.equal(result[1], rating2);
        assert.equal(result[0], client2);
      })
      .then(() => ratingsLibrary.getJobRating(client2, jobId2))
      .then(result => {
        assert.equal(result[1], rating3);
        assert.equal(result[0], worker2);
      })
      .then(() => helpers.assertExpectations(mock));
    });

  });


  describe('Skill rating', () => {

    it("should NOT allow to rate worker skills if a job is not at FINALIZED state"); // TODO

    it('should NOT allow to rate worker skills from anybody but job client'); // TODO

    it('should NOT allow to rate worker skills for anybody but job worker'); // TODO

    it('should NOT allow to rate worker skills if a job was FINALIZED before it was STARTED'); // TODO

    it('should NOT allow to set skills if already set'); // TODO: implement all possible cases

    it('should allow to rate worker skills with valid parameters on successfully finished job', () => {
      const jobId = 1;
      const rateArea = helpers.getFlag(0);
      const rateCategory = helpers.getFlag(0);
      const rateSkills = [1, 2, 4];
      const ratings = [3, 7, 9];
      return Promise.resolve()
        .then(() => rateJob(jobId, rateArea, rateCategory, rateSkills, ratings))
        .then(() => Promise.each(rateSkills, (skill, i) => {
          return ratingsLibrary.getSkillRating(
            worker, rateArea, rateCategory, skill, jobId
          )
            .then(result => {
              assert.equal(result[0], client);
              assert.equal(result[1], ratings[i]);
            });
        }));
    });

    it('should allow to rate worker skills with all final states after STARTED'); // TODO: implement all possible cases

    it('should emit "SkillRatingGiven" event on valid `rateWorkerSkills`', () => {
      const jobId = 1;
      const rateArea = helpers.getFlag(0);
      const rateCategory = helpers.getFlag(0);
      const rateSkills = [1, 2, 4];
      const ratings = [3, 7, 9];
      return Promise.resolve()
        .then(() => rateJob(jobId, rateArea, rateCategory, rateSkills, ratings))
        .then(tx => {
          assert.equal(tx.logs.length, 3);
          return Promise.each(rateSkills, (skill, i) => {
            assert.equal(tx.logs[i].event, "SkillRatingGiven");
            assert.equal(tx.logs[i].args.jobId, jobId);
            assert.equal(tx.logs[i].args.rater, client);
            assert.equal(tx.logs[i].args.to, worker);
            assert.equal(tx.logs[i].args.area.toString(), rateArea.toString());
            assert.equal(tx.logs[i].args.category.toString(), rateCategory.toString());
            assert.equal(tx.logs[i].args.skill.toString(), rateSkills[i].toString());
            assert.equal(tx.logs[i].args.rating, ratings[i]);
          });
        });
    });


    it('should set valid worker area rating', () => {
      const area = helpers.getFlag(3);
      const rating = 7;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area), true))
        .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, multiEventsHistory.address);
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
        .then(() => helpers.assertExpectations(mock));
    });

    it('should set valid worker category rating', () => {
      const area = helpers.getFlag(2);
      const category = helpers.getFlag(3);
      const rating = 7;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category), true))
        .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, multiEventsHistory.address);
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
        .then(() => helpers.assertExpectations(mock));
    });

    it('should set valid worker skill rating', () => {
      const area = helpers.getFlag(1);
      const category = helpers.getFlag(2);
      const skill = helpers.getFlag(3);
      const rating = 7;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill), true))
        .then(() => ratingsLibrary.setSkillRating(worker, rating, area, category, skill, jobId, {from: client}))
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, multiEventsHistory.address);
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
        .then(() => helpers.assertExpectations(mock));
    });

    it('should NOT set invalid worker area rating', () => {
      const area = helpers.getFlag(4);
      const rating = 25;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area), true))
        .then(() => ratingsLibrary.setAreaRating(worker, rating, area, jobId, {from: client}))
        .then(result => assert.equal(result.logs.length, 0))
        .then(() => ratingsLibrary.getAreaRating(worker, area, client, jobId))
        .then(result => {
          assert.equal(result[1], 0);
          assert.equal(result[0], 0);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    it('should NOT set invalid worker category rating', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const rating = 100500;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category), true))
        .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))
        .then(result => assert.equal(result.logs.length, 0))
        .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
        .then(result => {
          assert.equal(result[1], 0);
          assert.equal(result[0], 0);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    it('should NOT set invalid worker skill rating', () => {
      const area = helpers.getFlag(3);
      const category = helpers.getFlag(2);
      const skill = helpers.getFlag(1);
      const rating = 100500;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category), true))
        .then(() => ratingsLibrary.setCategoryRating(worker, rating, area, category, jobId, {from: client}))
        .then(result => assert.equal(result.logs.length, 0))
        .then(() => ratingsLibrary.getCategoryRating(worker, area, category, client, jobId))
        .then(result => {
          assert.equal(result[1], 0);
          assert.equal(result[0], 0);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    // FIXME
    it.skip('should store different area ratings', () => {
      const area1 = helpers.getFlag(1);
      const area2 = helpers.getFlag(2);
      const rating1 = 1;
      const rating2 = 2;
      const client1 = accounts[2];
      const client2 = accounts[3];
      const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
      const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
      const jobId1 = 100501;
      const jobId2 = 100502;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker1, area1), true))
        .then(() => ratingsLibrary.setAreaRating(worker1, rating1, area1, jobId1, {from: client1}))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2), true))
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
        .then(() => helpers.assertExpectations(mock));
    });

    // FIXME
    it.skip('should store different category ratings', () => {
      const area1 = helpers.getFlag(1);
      const category1 = helpers.getFlag(1);
      const area2 = helpers.getFlag(2);
      const category2 = helpers.getFlag(2);
      const rating1 = 1;
      const rating2 = 2;
      const client1 = accounts[2];
      const client2 = accounts[3];
      const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
      const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
      const jobId1 = 100501;
      const jobId2 = 100502;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker1, area1, category1), true))
        .then(() => ratingsLibrary.setCategoryRating(worker1, rating1, area1, category1, jobId1, {from: client1}))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker2, area2), true))
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
        .then(() => helpers.assertExpectations(mock));
    });

    // FIXME
    it.skip('should store different skill ratings', () => {
      const area1 = helpers.getFlag(1);
      const category1 = helpers.getFlag(1);
      const skill1 = helpers.getFlag(2);
      const area2 = helpers.getFlag(2);
      const category2 = helpers.getFlag(2);
      const skill2 = helpers.getFlag(2);
      const rating1 = 1;
      const rating2 = 2;
      const client1 = accounts[2];
      const client2 = accounts[3];
      const worker1 = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeffe';
      const worker2 = '0xeeeeeeeeeeeeeeeeeeeeeeeeffeeeeeeeeeeeeee';
      const jobId1 = 100501;
      const jobId2 = 100502;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker1, area1, category1, skill1), true))
        .then(() => ratingsLibrary.setSkillRating(worker1, rating1, area1, category1, skill1, jobId1, {from: client1}))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2, category2, skill2), true))
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
        .then(() => helpers.assertExpectations(mock));
    });

    it('should NOT have area rating set when category rating set', () => {
      const area = helpers.getFlag(1);
      const category = helpers.getFlag(2);
      const rating = 2;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category), true))
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
        .then(() => helpers.assertExpectations(mock));
    });

    it('should NOT have category and area rating set when skill rating set', () => {
      const area = helpers.getFlag(1);
      const category = helpers.getFlag(2);
      const skill = helpers.getFlag(2);
      const rating = 2;
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill), true))
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
        .then(() => helpers.assertExpectations(mock));
    });


    // deprecated

    it.skip('should set many rates', () => {
      const areas = helpers.getFlag(4).add(helpers.getEvenFlag(5)).add(helpers.getFlag(5));
      const categories = [helpers.getFlag(7).add(helpers.getEvenFlag(9)).add(helpers.getFlag(9)).add(helpers.getFlag(10)).add(helpers.getFlag(25))];
      const skills = [helpers.getFlag(9), helpers.getFlag(12), helpers.getFlag(13).add(helpers.getEvenFlag(23))];
      const ratings = [9, 8, 7, 6, 5];
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, helpers.getFlag(4), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23))), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, helpers.getFlag(5)), true))
        .then(() => ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client}))
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), ratings[0]);
          assert.equal(result[0], client);
        })
        .then(() => ratingsLibrary.getCategoryRating(worker, helpers.getFlag(4), helpers.getFlag(9), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), ratings[1]);
          assert.equal(result[0], client);
        })
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), ratings[2]);
          assert.equal(result[0], client);
        })
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23)), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), ratings[3]);
          assert.equal(result[0], client);
        })
        .then(() => ratingsLibrary.getAreaRating(worker, helpers.getFlag(5), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), ratings[4]);
          assert.equal(result[0], client);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    it.skip('should not set many rates if doesn\'t have role', () => {
      const areas = helpers.getFlag(4).add(helpers.getEvenFlag(5)).add(helpers.getFlag(5));
      const categories = [helpers.getFlag(7).add(helpers.getEvenFlag(9)).add(helpers.getFlag(9)).add(helpers.getFlag(10)).add(helpers.getFlag(25))];
      const skills = [helpers.getFlag(9), helpers.getFlag(12), helpers.getFlag(13).add(helpers.getEvenFlag(23))];
      const ratings = [9, 8, 7, 6, 5];
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, helpers.getFlag(4), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23))), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, helpers.getFlag(5)), true))
        .then(() => ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client}))
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), 0);
          assert.equal(result[0], 0);
        })
        .then(() => ratingsLibrary.getCategoryRating(worker, helpers.getFlag(4), helpers.getFlag(9), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), 0);
          assert.equal(result[0], 0);
        })
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), 0);
          assert.equal(result[0], 0);
        })
        .then(() => ratingsLibrary.getSkillRating(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23)), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), 0);
          assert.equal(result[0], 0);
        })
        .then(() => ratingsLibrary.getAreaRating(worker, helpers.getFlag(5), jobId))
        .then(result => {
          assert.equal(result[1].valueOf(), 0);
          assert.equal(result[0], 0);
        })
        .then(() => helpers.assertExpectations(mock));
    });

    it.skip('should not set many rates if doesn\'t have at least one of listed areas/categories/skills', () => {
      const areas = helpers.getFlag(4).add(helpers.getEvenFlag(5)).add(helpers.getFlag(5));
      const categories = [helpers.getFlag(7).add(helpers.getEvenFlag(9)).add(helpers.getFlag(9)).add(helpers.getFlag(10)).add(helpers.getFlag(25))];
      const skills = [helpers.getFlag(9), helpers.getFlag(12), helpers.getFlag(13).add(helpers.getEvenFlag(23))];
      const ratings = [9, 8, 7, 6, 5];
      const jobId = 1;
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, helpers.getFlag(4), helpers.getFlag(9)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12)), true))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23))), false))
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, helpers.getFlag(5)), true))
        .then(() => asserts.throws(ratingsLibrary.setManyRatings(worker, areas, categories, skills, ratings, jobId, {from: client})))
        .then(() => helpers.assertExpectations(mock));
    });

  });


  describe('Skill evaluation', () => {

    it('should check auth on area evaluation');  // TODO

    it('should check auth on category evaluation');  // TODO

    it('should check auth on skill evaluation');  // TODO

    it('should check auth on multiple evaluation');  // TODO


    it('should not set invalid worker area evaluation', () => {
      const area = helpers.getFlag(4);
      const rating = 823847;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  true))
      .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should not set invalid worker category evaluation', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const rating = 823847;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
      .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should not set invalid worker skill evaluation', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const skill = helpers.getFlag(9);
      const rating = 823847;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
      .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    });


    it('should not set worker area evaluation if worker doesn\'t have that area', () => {
      const area = helpers.getFlag(4);
      const rating = 3;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area),  false))
      .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should not set worker category evaluation if worker doesn\'t have that category', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const rating = 4;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  false))
      .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))
      .then(result => assert.equal(result.logs.length, 0))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should not set worker skill evaluation if worker doesn\'t have that skill', () => {
    const area = helpers.getFlag(4);
    const category = helpers.getFlag(7);
    const skill = helpers.getFlag(9);
    const rating = 8;
    const evaluator = accounts[2];
    const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return Promise.resolve()
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  false))
    .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))
    .then(result => assert.equal(result.logs.length, 0))
    .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
    .then(result => assert.equal(result.valueOf(), 0))
    .then(() => helpers.assertExpectations(mock));
  });


    it('should set valid worker area evaluation ', () => {
      const area = helpers.getFlag(3);
      const rating = 8;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
        .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, area), true))
        .then(() => ratingsLibrary.evaluateArea(worker, rating, area, {from: evaluator}))
        .then(result => {
          assert.equal(result.logs.length, 1);
          assert.equal(result.logs[0].address, multiEventsHistory.address);
          assert.equal(result.logs[0].event, 'AreaEvaluated');
          assert.equal(result.logs[0].args.rater, evaluator);
          assert.equal(result.logs[0].args.to, worker);
          assert.equal(result.logs[0].args.rating, rating);
          equal(result.logs[0].args.area, area);
        })
        .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
        .then(result => assert.equal(result.valueOf(), rating))
        .then(() => helpers.assertExpectations(mock));
    });

    it('should set valid worker category evaluation ', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const rating = 8;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
      .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, multiEventsHistory.address);
        assert.equal(result.logs[0].event, 'CategoryEvaluated');
        assert.equal(result.logs[0].args.rater, evaluator);
        assert.equal(result.logs[0].args.to, worker);
        assert.equal(result.logs[0].args.rating, rating);
        equal(result.logs[0].args.area, area);
        equal(result.logs[0].args.category, category);
      })
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
      .then(result => assert.equal(result.valueOf(), rating))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should set valid worker skill evaluation ', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const skill = helpers.getFlag(9);
      const rating = 8;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
      .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))
      .then(result => {
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].address, multiEventsHistory.address);
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
      .then(() => helpers.assertExpectations(mock));
    });


    it('should store different area evaluations', () => {
      const area1 = helpers.getFlag(1);
      const area2 = helpers.getFlag(2);
      const rating1 = 8;
      const rating2 = 9;
      const evaluator1 = accounts[2];
      const evaluator2 = accounts[3];
      const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker1, area1),  true))
      .then(() => ratingsLibrary.evaluateArea(worker1, rating1, area1, {from: evaluator1}))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker2, area2),  true))
      .then(() => ratingsLibrary.evaluateArea(worker2, rating2, area2, {from: evaluator2}))
      .then(() => ratingsLibrary.getAreaEvaluation(worker1, area1, evaluator1))
      .then(result => assert.equal(result.valueOf(), rating1))
      .then(() => ratingsLibrary.getAreaEvaluation(worker2, area2, evaluator2))
      .then(result => assert.equal(result.valueOf(), rating2))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should store different category evaluations', () => {
      const area1 = helpers.getFlag(1);
      const category1 = helpers.getFlag(1);
      const area2 = helpers.getFlag(2);
      const category2 = helpers.getFlag(2);
      const rating1 = 8;
      const rating2 = 9;
      const evaluator1 = accounts[2];
      const evaluator2 = accounts[3];
      const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker1, area1, category1),  true))
      .then(() => ratingsLibrary.evaluateCategory(worker1, rating1, area1, category1, {from: evaluator1}))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker2, area2, category2),  true))
      .then(() => ratingsLibrary.evaluateCategory(worker2, rating2, area2, category2, {from: evaluator2}))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker1, area1, category1, evaluator1))
      .then(result => assert.equal(result.valueOf(), rating1))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker2, area2, category2, evaluator2))
      .then(result => assert.equal(result.valueOf(), rating2))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should store different skill evaluations', () => {
    const area1 = helpers.getFlag(1);
    const category1 = helpers.getFlag(1);
    const skill1 = helpers.getFlag(1);
    const area2 = helpers.getFlag(2);
    const category2 = helpers.getFlag(2);
    const skill2 = helpers.getFlag(2);
    const rating1 = 8;
    const rating2 = 9;
    const evaluator1 = accounts[2];
    const evaluator2 = accounts[3];
    const worker1 = '0xeeeeeeee11eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const worker2 = '0xeeeeeeee22eeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return Promise.resolve()
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker1, area1, category1, skill1),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker1, rating1, area1, category1, skill1, {from: evaluator1}))
    .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker2, area2, category2, skill2),  true))
    .then(() => ratingsLibrary.evaluateSkill(worker2, rating2, area2, category2, skill2, {from: evaluator2}))
    .then(() => ratingsLibrary.getSkillEvaluation(worker1, area1, category1, skill1, evaluator1))
    .then(result => assert.equal(result.valueOf(), rating1))
    .then(() => ratingsLibrary.getSkillEvaluation(worker2, area2, category2, skill2, evaluator2))
    .then(result => assert.equal(result.valueOf(), rating2))
    .then(() => helpers.assertExpectations(mock));
  });


    it('should not have area evaluation set when category evaluation set', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const rating = 8;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, area, category),  true))
      .then(() => ratingsLibrary.evaluateCategory(worker, rating, area, category, {from: evaluator}))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
      .then(result => assert.equal(result.valueOf(), rating))
      .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    })

    it('should not have category and area evaluation set when skill evaluation set', () => {
      const area = helpers.getFlag(4);
      const category = helpers.getFlag(7);
      const skill = helpers.getFlag(9);
      const rating = 8;
      const evaluator = accounts[2];
      const worker = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, area, category, skill),  true))
      .then(() => ratingsLibrary.evaluateSkill(worker, rating, area, category, skill, {from: evaluator}))
      .then(() => ratingsLibrary.getSkillEvaluation(worker, area, category, skill, evaluator))
      .then(result => assert.equal(result.valueOf(), rating))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, area, category, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => ratingsLibrary.getAreaEvaluation(worker, area, evaluator))
      .then(result => assert.equal(result.valueOf(), 0))
      .then(() => helpers.assertExpectations(mock));
    })


    it('should set many evaluations', () => {
      const areas = helpers.getFlag(4).add(helpers.getEvenFlag(5)).add(helpers.getFlag(5));
      const categories = [helpers.getFlag(7).add(helpers.getEvenFlag(9)).add(helpers.getFlag(9)).add(helpers.getFlag(10)).add(helpers.getFlag(25))];
      const skills = [helpers.getFlag(9), helpers.getFlag(12), helpers.getFlag(13).add(helpers.getEvenFlag(23))];
      const ratings = [9, 8, 7, 6, 5];
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, helpers.getFlag(4), helpers.getFlag(9)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23))),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, helpers.getFlag(5)),  true))
      .then(() => ratingsLibrary.evaluateMany(worker, areas, categories, skills, ratings, {from: client}))
      .then(() => ratingsLibrary.getSkillEvaluation(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9), client))
      .then(result => assert.equal(result.valueOf(), ratings[0]))
      .then(() => ratingsLibrary.getCategoryEvaluation(worker, helpers.getFlag(4), helpers.getFlag(9), client))
      .then(result => assert.equal(result.valueOf(), ratings[1]))
      .then(() => ratingsLibrary.getSkillEvaluation(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12), client))
      .then(result => assert.equal(result.valueOf(), ratings[2]))
      .then(() => ratingsLibrary.getSkillEvaluation(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23)), client))
      .then(result => assert.equal(result.valueOf(), ratings[3]))
      .then(() => ratingsLibrary.getAreaEvaluation(worker, helpers.getFlag(5), client))
      .then(result => assert.equal(result.valueOf(), ratings[4]))
      .then(() => helpers.assertExpectations(mock));
    });

    it('should not set many evaluations if doesn\'t have at least one of listed areas/categories/skills', () => {
      const areas = helpers.getFlag(4).add(helpers.getEvenFlag(5)).add(helpers.getFlag(5));
      const categories = [helpers.getFlag(7).add(helpers.getEvenFlag(9)).add(helpers.getFlag(9)).add(helpers.getFlag(10)).add(helpers.getFlag(25))];
      const skills = [helpers.getFlag(9), helpers.getFlag(12), helpers.getFlag(13).add(helpers.getEvenFlag(23))];
      const ratings = [9, 8, 7, 6, 5];
      return Promise.resolve()
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(7), helpers.getFlag(9)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasCategory.getData(worker, helpers.getFlag(4), helpers.getFlag(9)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(10), helpers.getFlag(12)),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasSkill.getData(worker, helpers.getFlag(4), helpers.getFlag(25), helpers.getFlag(13).add(helpers.getEvenFlag(23))),  true))
      .then(() => mock.expect(ratingsLibrary.address, 0, userLibrary.hasArea.getData(worker, helpers.getFlag(5)),  false))
      .then(() => asserts.throws(ratingsLibrary.evaluateMany(worker, areas, categories, skills, ratings, {from: client})))
      .then(() => helpers.assertExpectations(mock));
    })

  });

});
