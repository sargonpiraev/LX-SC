const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');
const Mock = artifacts.require('./Mock.sol');
const PaymentGatewayInterface = artifacts.require('./PaymentGatewayInterface.sol');
const Promise = require('bluebird');

contract('PaymentProcessor', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let paymentGateway = web3.eth.contract(PaymentGatewayInterface.abi).at('0x0');
  let mock;
  let paymentProcessor;
  let jobControllerAddress = accounts[5];

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
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => PaymentProcessor.deployed())
    .then(instance => paymentProcessor = instance)
    .then(() => paymentProcessor.setPaymentGateway(mock.address))
    .then(() => paymentProcessor.setJobController(jobControllerAddress))
    .then(reverter.snapshot);
  });

  it('should call transferWithFee on lockPayment', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, jobControllerAddress, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should not call transferWithFee on lockPayment if called not from jobController', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: accounts[0]}))
    .then(assertExpectations());
  });

  it('should call transferToMany on releasePayment', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferToMany.getData(payer, receivers, values, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should not call transferToMany on releasePayment if called not from jobController', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.releasePayment(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: accounts[0]}))
    .then(assertExpectations());
  });

  it('should return transferWithFee fail on lockPayment', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const result = 0;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, jobControllerAddress, value, 0, 0, erc20ContractAddress), result))
    .then(() => paymentProcessor.lockPayment.call(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(asserts.isFalse);
  });

  it('should return transferWithFee success on lockPayment', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const result = 1;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, jobControllerAddress, value, 0, 0, erc20ContractAddress), result))
    .then(() => paymentProcessor.lockPayment.call(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(asserts.isTrue);
  });

  it('should return transferToMany fail on releasePayment', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const result = 0;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferToMany.getData(payer, receivers, values, feeFromValue, additionalFee, erc20ContractAddress), result))
    .then(() => paymentProcessor.releasePayment.call(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(asserts.isFalse);
  });

  it('should return transferToMany success on releasePayment', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const result = 1;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferToMany.getData(payer, receivers, values, feeFromValue, additionalFee, erc20ContractAddress), result))
    .then(() => paymentProcessor.releasePayment.call(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(asserts.isTrue);
  });

  it('should not call transferWithFee on lockPayment if serviceMode is enabled', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should call transferWithFee on lockPayment if serviceMode is enabled and operation is approved', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.approve(operationId))
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, jobControllerAddress, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations())
    .then(() => paymentProcessor.approved(operationId))
    .then(asserts.isFalse);
  });

  it('should not call transferToMany on releasePayment if serviceMode is enabled', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.releasePayment(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should call transferToMany on releasePayment if serviceMode is enabled and operation is approved', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.approve(operationId))
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferToMany.getData(payer, receivers, values, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations())
    .then(() => paymentProcessor.approved(operationId))
    .then(asserts.isFalse);
  });

  it('should call transferWithFee on lockPayment if serviceMode is disabled', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode())
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, jobControllerAddress, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should call transferToMany on releasePayment if serviceMode is disabled', () => {
    const payer = jobControllerAddress;
    const receivers = ['0xffffffffffffffffffffffffffffffffffffff00', '0xffffffffffffffffffffffffffffffffffff0000'];
    const values = ['0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00', 1];
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode())
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferToMany.getData(payer, receivers, values, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receivers, values, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should allow to enable service mode', () => {
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isTrue);
  });

  it('should allow to disable service mode', () => {
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode())
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isFalse);
  });

  it('should not allow to enable service mode if called not by owner', () => {
    const notOwner = accounts[1];
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode({from: notOwner}))
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isFalse);
  });

  it('should not allow to disable service mode if called not by owner', () => {
    const notOwner = accounts[1];
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode({from: notOwner}))
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isTrue);
  });
});
