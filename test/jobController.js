const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Promise = require('bluebird');
const Storage = artifacts.require('./Storage.sol');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const FakeCoin = artifacts.require('./FakeCoin.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const ERC20Interface = artifacts.require('./ERC20Interface.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const Mock = artifacts.require('./Mock.sol');

const JobController = artifacts.require('./JobController.sol');

const helpers = require('./helpers/helpers');

contract('JobController', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  const roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  const userLibraryInterface = web3.eth.contract(UserLibrary.abi).at('0x0');
  let storage;
  let jobController;
  let multiEventsHistory;
  let paymentProcessor;
  let erc20Library;
  let erc20Interface = web3.eth.contract(ERC20Interface.abi).at('0x0');
  let fakeCoin;
  let paymentGateway;
  let balanceHolder;
  let mock;

  const client = accounts[1];
  const worker = accounts[2];

  const assertInternalBalance = (address, coinAddress, expectedValue) => {
    return (actualValue) => {
      return paymentGateway.getBalance(address, coinAddress)
      .then(asserts.equal(expectedValue));
    };
  };

  const assertExternalBalance = (address, coinAddress, expectedValue) => {
    return (actualValue) => {
      return paymentGateway.getBalanceOf(address, coinAddress)
      .then(asserts.equal(expectedValue));
    };
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

  const ignoreAuth = (enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  };

  const ignoreSkillsCheck = (enabled = true) => {
    return mock.ignore(userLibraryInterface.hasSkills.getData().slice(0, 10), enabled);
  }

  const operationAllowance = (operation, args, results) => {
    let stages = {
      CREATED: false,
      ACCEPTED: false,
      PENDING_START: false,
      STARTED: false,
      PENDING_FINISH: false,
      FINISHED: false,
      FINALIZED: false
    };
    for (let stage in results) {
      stages[stage] = results[stage];
    }


    const jobId = 1;
    const jobArea = 333;
    const jobCategory = 333;
    const jobSkills = 333;
    const jobDetails = 'Le Job Description';
    const additionalTime = 60;

    const workerRate = '0x12f2a36ecd555';
    const workerOnTop = '0x12f2a36ecd555';
    const jobEstimate = 180;

    return Promise.resolve()
      // Represents full chain of interactions between client and worker
      // Provided `operation` will try to execute on each stage, comparing with expected results

      .then(() => jobController.postJob(jobArea, jobCategory, jobSkills, jobDetails, {from: client}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.CREATED))

      .then(() => jobController.postJobOffer(jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}))
      .then(() => paymentProcessor.approve(jobId))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.ACCEPTED))

      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.PENDING_START))

      .then(() => jobController.confirmStartWork(jobId, {from: client}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.STARTED))

      .then(() => jobController.endWork(1, {from: worker}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.PENDING_FINISH))

      .then(() => jobController.confirmEndWork(jobId, {from: client}))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.FINISHED))

      .then(() => jobController.releasePayment(jobId))
      .then(() => operation.call(...args))
      .then(result => assert.equal(result, stages.FINALIZED))

      //.then(console.log('hi'));
  }


  const onReleasePayment = (timeSpent, jobPaymentEstimate, pauses) => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    const timeOps = () => {
      if (pauses) {
        return Promise.resolve()
        .then(() => helpers.increaseTime(timeSpent / 2 * 60))
        .then(() => helpers.mine())
        .then(() => jobController.pauseWork(jobId, {from: worker}))
        .then(() => helpers.increaseTime(30 * 60))
        .then(() => helpers.mine())
        .then(() => jobController.resumeWork(jobId, {from: worker}))
        .then(() => helpers.increaseTime(timeSpent / 2 * 60))
        .then(() => helpers.mine())
      } else {
        return Promise.resolve()
        .then(() => helpers.increaseTime(timeSpent * 60))
        .then(() => helpers.mine())
      }
    }

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => jobController.confirmStartWork(jobId, {from: client}))
      .then(() => timeOps())
      .then(() => jobController.endWork(jobId, {from: worker}))
      .then(() => jobController.confirmEndWork(jobId, {from: client}))
      .then(() => jobController.releasePayment(jobId))
      .then(() => assertInternalBalance(client, fakeCoin.address, clientBalanceBefore.sub(jobPaymentEstimate)))
      .then(() => assertInternalBalance(worker, fakeCoin.address, workerBalanceBefore.add(jobPaymentEstimate)))
      .then(() => assertInternalBalance(jobId, fakeCoin.address, 0));
  }

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => ignoreAuth())
    .then(() => ignoreSkillsCheck())
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => Storage.deployed())
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => BalanceHolder.deployed())
    .then(instance => balanceHolder = instance)
    .then(() => FakeCoin.deployed())
    .then(instance => fakeCoin = instance)
    .then(() => ERC20Library.deployed())
    .then(instance => erc20Library = instance)
    .then(() => PaymentGateway.deployed())
    .then(instance => paymentGateway = instance)
    .then(() => PaymentProcessor.deployed())
    .then(instance => paymentProcessor = instance)
    .then(() => JobController.deployed())
    .then(instance => jobController = instance)
    .then(() => multiEventsHistory.authorize(erc20Library.address))
    .then(() => multiEventsHistory.authorize(paymentGateway.address))
    .then(() => multiEventsHistory.authorize(jobController.address))

    .then(() => erc20Library.setupEventsHistory(multiEventsHistory.address))
    .then(() => erc20Library.addContract(fakeCoin.address))

    .then(() => paymentGateway.setupEventsHistory(multiEventsHistory.address))
    .then(() => paymentGateway.setERC20Library(erc20Library.address))
    .then(() => paymentGateway.setBalanceHolder(balanceHolder.address))

    .then(() => paymentProcessor.setPaymentGateway(paymentGateway.address))

    .then(() => jobController.setupEventsHistory(multiEventsHistory.address))
    .then(() => jobController.setPaymentProcessor(paymentProcessor.address))
    .then(() => jobController.setUserLibrary(mock.address))

    .then(() => fakeCoin.mint(client, '0xfffffffffffffffffff'))
    .then(() => paymentGateway.deposit('0xfffffffffffffffffff', fakeCoin.address, {from: client}))
    .then(reverter.snapshot);
  });


  it('should check auth on setup event history', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setupEventsHistory.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setupEventsHistory(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting a payment processor', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setPaymentProcessor.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setPaymentProcessor(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting a user library', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      jobController.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        jobController.address,
        jobController.contract.setUserLibrary.getData().slice(0, 10)
      ), 0)
    )
    .then(() => jobController.setUserLibrary(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should allow anyone to post a job');

  it('should allow anyone to post an offer for a job only when a job has CREATED status', () => {
    const operation = jobController.postJobOffer;
    const args = [1, FakeCoin.address, '0x12F2A36ECD555', 180, '0x12F2A36ECD555', {from: worker}];
    const results = {CREATED: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });

  it('should check skills on posting job offer');

  it('should allow assigned worker to request work start only when a job has ACCEPTED status', () => {
    const operation = jobController.startWork;
    const args = [1, {from: worker}];
    const results = {ACCEPTED: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });

  it('should allow client to confirm start work only when job has PENDING_START status', () => {
    const operation = jobController.confirmStartWork;
    const args = [1, {from: client}];
    const results = {PENDING_START: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });

  it('should allow assigned worker to request end work only when job has STARTED status', () => {
    const operation = jobController.endWork;
    const args = [1, {from: worker}];
    const results = {STARTED: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });

  it('should allow client to confirm end work only when job has PENDING_FINISH status', () => {
    const operation = jobController.confirmEndWork;
    const args = [1, {from: client}];
    const results = {PENDING_FINISH: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });

  it('should allow anyone to release payment only when job has FINISHED status', () => {
    const operation = jobController.releasePayment;
    const args = [1, {from: accounts[3]}];
    const results = {FINISHED: true};
    return Promise.resolve()
      .then(() => operationAllowance(operation, args, results));
  });


  it('should throw on `acceptOffer` if client has insufficient funds', () => {
    return Promise.resolve()
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
          1, fakeCoin.address, '0xfffffffffffffffffff', 1, 1, {from: worker}
        )
      )
      .then(() => asserts.throws(
        jobController.acceptOffer(1, {from: client})
      ));
  });

  it('should throw on `acceptOffer` if unsupported token contract is provided', () => {
      return Promise.resolve()
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
          1, jobController.address, '0xfffffffffffffffffff', 1, 1, {from: worker}
        )
      )
      .then(() => asserts.throws(
        jobController.acceptOffer(1, {from: client})
      ));
  });

  it('should lock correct amount of tokens on `acceptOffer`', () => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    const estimatedLockAmount = Math.floor(
      ((workerRate * (jobEstimate + 60) + workerOnTop) * 11) / 10
    );

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(1, worker, {from: client}))
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => {
        const clientBalanceAfter = clientBalanceBefore.sub(estimatedLockAmount);
        assert.equal(result.toString(), clientBalanceAfter.toString())
      })
      .then(() => paymentGateway.getBalance(jobId, fakeCoin.address))
      .then(result => assert.equal(result.toString(), estimatedLockAmount.toString()))
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => assert.equal(result.toString(), workerBalanceBefore.toString()));
  });

  it('should emit event when job is posted', () => {
    const skillsArea = '333';
    const skillsCategory = '444';
    const skills = '555';
    const jobDetails = "Le details";

    return Promise.resolve()
      .then(() => jobController.postJob(skillsArea, skillsCategory, skills, jobDetails, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.client, client);
        assert.equal(log.skillsArea.toString(), skillsArea);
        assert.equal(log.skillsCategory.toString(), skillsCategory);
        assert.equal(log.skills.toString(), skills);
        // TODO: handle hash matches
      });
  });

  it('should emit all events on a workflow with completed job', () => {
    const skillsArea = '333';
    const skillsCategory = '444';
    const skills = '555';
    const jobDetails = "Le details";

    const workerRate = '0x12f2a36ecd555';
    const workerOnTop = '0x12f2a36ecd555';
    const jobEstimate = 180;

    return Promise.resolve()
      // Post job
      .then(() => jobController.postJob(skillsArea, skillsCategory, skills, jobDetails, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.client, client);
        assert.equal(log.skillsArea.toString(), skillsArea);
        assert.equal(log.skillsCategory.toString(), skillsCategory);
        assert.equal(log.skills.toString(), skills);
        // TODO: handle hash matches
      })
      // Post job offer
      .then(() => jobController.postJobOffer(
          1, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
        )
      )
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.worker, worker);
        assert.equal('0x' + log.rate.toString(16), workerRate);
        assert.equal(log.estimate.toString(), jobEstimate);
        assert.equal('0x' + log.ontop.toString(16), workerOnTop);
      })
      // Accept job offer
      .then(() => jobController.acceptOffer(1, worker, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.worker, worker);
      })
      // Request start of work
      .then(() => jobController.startWork(1, {from: worker}))
      .then(tx => assert.equal(tx.logs.length, 0))
      // Confirm start of work
      .then(() => jobController.confirmStartWork(1, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Pause work
      .then(() => jobController.pauseWork(1, {from: worker}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Resume work
      .then(() => jobController.resumeWork(1, {from: worker}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Add more time
      .then(() => jobController.addMoreTime(1, 60, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.time.toString(), '60');
      })
      // Request end of work
      .then(() => jobController.endWork(1, {from: worker}))
      .then(tx => assert.equal(tx.logs.length, 0))
      // Confirm end of work
      .then(() => jobController.confirmEndWork(1, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      });
  });

  it('should emit all events on a workflow with canceled job', () => {
    const skillsArea = '333';
    const skillsCategory = '444';
    const skills = '555';
    const jobDetails = "Le details";

    const workerRate = '0x12f2a36ecd555';
    const workerOnTop = '0x12f2a36ecd555';
    const jobEstimate = 180;

    return Promise.resolve()
      // Post job
      .then(() => jobController.postJob(skillsArea, skillsCategory, skills, jobDetails, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.client, client);
        assert.equal(log.skillsArea.toString(), skillsArea);
        assert.equal(log.skillsCategory.toString(), skillsCategory);
        assert.equal(log.skills.toString(), skills);
        // TODO: handle hash matches
      })
      // Post job offer
      .then(() => jobController.postJobOffer(
          1, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
        )
      )
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.worker, worker);
        assert.equal('0x' + log.rate.toString(16), workerRate);
        assert.equal(log.estimate.toString(), jobEstimate);
        assert.equal('0x' + log.ontop.toString(16), workerOnTop);
      })
      // Accept job offer
      .then(() => jobController.acceptOffer(1, worker, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.worker, worker);
      })
      // Request start of work
      .then(() => jobController.startWork(1, {from: worker}))
      .then(tx => assert.equal(tx.logs.length, 0))
      // Confirm start of work
      .then(() => jobController.confirmStartWork(1, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Pause work
      .then(() => jobController.pauseWork(1, {from: worker}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Resume work
      .then(() => jobController.resumeWork(1, {from: worker}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        const now = new Date() / 1000;
        assert.isTrue(now >= log.at.toNumber() && log.at.toNumber() >= now - 2)
      })
      // Add more time
      .then(() => jobController.addMoreTime(1, 60, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
        assert.equal(log.time.toString(), '60');
      })
      // Request end of work
      .then(() => jobController.endWork(1, {from: worker}))
      .then(tx => assert.equal(tx.logs.length, 0))
      // Cancel job
      .then(() => jobController.cancelJob(1, {from: client}))
      .then(tx => {
        assert.equal(tx.logs.length, 1);
        const log = tx.logs[0].args;
        assert.equal(log.self, jobController.address);
        assert.equal(log.jobId.toString(), '1');
      });
  });

  it('should release just jobOfferOnTop on `cancelJob` on ACCEPTED job stage', () => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobController.cancelJob(jobId, {from: client}))
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => assert.equal(result.toString(), clientBalanceBefore.sub(workerOnTop).toString()))
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => assert.equal(result.toString(), workerBalanceBefore.add(workerOnTop).toString()))
      .then(() => paymentGateway.getBalance(jobId, fakeCoin.address))
      .then(result => assert.equal(result.toString(), '0'));
  });

  it('should release just jobOfferOnTop on `cancelJob` on PENDING_START job stage', () => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => jobController.cancelJob(jobId, {from: client}))
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => assert.equal(result.toString(), clientBalanceBefore.sub(workerOnTop).toString()))
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => assert.equal(result.toString(), workerBalanceBefore.add(workerOnTop).toString()))
      .then(() => paymentGateway.getBalance(jobId, fakeCoin.address))
      .then(result => assert.equal(result.toString(), '0'));
  });

  it('should release jobOnTop + 1 hour of work + jobOnTop on `cancelJob` on STARTED job stage', () => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    const jobPaymentEstimate = workerRate * 60 + workerOnTop;

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => jobController.confirmStartWork(jobId, {from: client}))
      .then(() => jobController.cancelJob(jobId, {from: client}))
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => assert.equal(result.toString(), clientBalanceBefore.sub(jobPaymentEstimate).toString()))
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => assert.equal(result.toString(), workerBalanceBefore.add(jobPaymentEstimate).toString()))
      .then(() => paymentGateway.getBalance(jobId, fakeCoin.address))
      .then(result => assert.equal(result.toString(), '0'));
  });

  it('should release jobOnTop + 1 hour of work + jobOnTop on `cancelJob` on PENDING_FINISH job stage', () => {
    const jobId = 1;
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;

    let clientBalanceBefore;
    let workerBalanceBefore;

    const jobPaymentEstimate = workerRate * 60 + workerOnTop;

    return Promise.resolve()
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => clientBalanceBefore = result)
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => workerBalanceBefore = result)
      .then(() => jobController.postJob(333, 333, 333, 'Le details', {from: client}))
      .then(() => jobController.postJobOffer(
        jobId, fakeCoin.address, workerRate, jobEstimate, workerOnTop, {from: worker}
      ))
      .then(() => jobController.acceptOffer(jobId, worker, {from: client}))
      .then(() => jobController.startWork(jobId, {from: worker}))
      .then(() => jobController.confirmStartWork(jobId, {from: client}))
      .then(() => jobController.endWork(jobId, {from: worker}))
      .then(() => jobController.cancelJob(jobId, {from: client}))
      .then(() => paymentGateway.getBalance(client, fakeCoin.address))
      .then(result => assert.equal(result.toString(), clientBalanceBefore.sub(jobPaymentEstimate).toString()))
      .then(() => paymentGateway.getBalance(worker, fakeCoin.address))
      .then(result => assert.equal(result.toString(), workerBalanceBefore.add(jobPaymentEstimate).toString()))
      .then(() => paymentGateway.getBalance(jobId, fakeCoin.address))
      .then(result => assert.equal(result.toString(), '0'));
  });


  it('should release correct amount of tokens on `releasePayment` when worked for exactly the estimated time', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = jobEstimate;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate);
  });

  it('should release correct amount of tokens on `releasePayment` when' +
     'worked for more than an hour but less than estimated time', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 183;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate);
  });

  it('should release correct amount of tokens on `releasePayment` when' +
     'worked for more than estimated time but less than estimated time and an hour', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 299;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate);
  });

  it('should release possible maximum of tokens(estimate + 1 hour)' +
      'when worked for more than estimate and an hour', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 340;
    const jobPaymentEstimate = workerRate * (jobEstimate + 60) + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate);
  });

  it('should release minimum an hour of work on `releasePayment` when worked for less than an hour', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 17;
    const jobPaymentEstimate = workerRate * 60 + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate);
  });



  it('should release correct amount of tokens on `releasePayment` ' +
     'when worked for exactly the estimated time, with pauses/resumes', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 183;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate, true);
  });

  it('should release correct amount of tokens on `releasePayment` when' +
     'worked for more than an hour but less than estimated time, with pauses/resumes', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 183;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate, true);
  });

  it('should release correct amount of tokens on `releasePayment` when' +
     'worked for more than estimated time but less than estimated time and an hour, with pauses/resumes', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 299;
    const jobPaymentEstimate = workerRate * timeSpent + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate, true);
  });

  it('should release possible maximum of tokens(estimate + 1 hour)' +
     'when worked for more than estimate and an hour, with pauses/resumes', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 340;
    const jobPaymentEstimate = workerRate * (jobEstimate + 60) + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate, true);
  });

  it('should release minimum an hour of work on `releasePayment`' +
     'when worked for less than an hour, with pauses/resumes', () => {
    const workerRate = 200000000000;
    const workerOnTop = 1000000000;
    const jobEstimate = 240;
    const timeSpent = 17;
    const jobPaymentEstimate = workerRate * 60 + workerOnTop;
    return onReleasePayment(timeSpent, jobPaymentEstimate, true);
  });

});
