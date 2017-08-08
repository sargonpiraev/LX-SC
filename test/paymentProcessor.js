"use strict";

const Mock = artifacts.require('./Mock.sol');
const PaymentGatewayInterface = artifacts.require('./PaymentGatewayInterface.sol');
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');

const Asserts = require('./helpers/asserts');
const Promise = require('bluebird');
const Reverter = require('./helpers/reverter');


contract('PaymentProcessor', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let paymentGateway = web3.eth.contract(PaymentGatewayInterface.abi).at('0x0');
  let mock;
  let paymentProcessor;
  let jobControllerAddress = accounts[5];
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');

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

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => ignoreAuth())
    .then(() => PaymentProcessor.deployed())
    .then(instance => paymentProcessor = instance)
    .then(() => paymentProcessor.setPaymentGateway(mock.address))
    //.then(() => paymentProcessor.setJobController(jobControllerAddress))
    .then(reverter.snapshot);
  });

  it('should check auth on setup payment gateway', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentProcessor.address,
        paymentProcessor.contract.setPaymentGateway.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.setPaymentGateway(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should call transferWithFee on lockPayment', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, addressOperationId, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it('should check auth on lockPayment call', () => {
    const caller = accounts[0];
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentProcessor.address,
        paymentProcessor.contract.lockPayment.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: caller}))
    .then(assertExpectations());
  });

  it.skip('should call transferToMany on releasePayment', () => {
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

  it('should call transferAll on releasePayment', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferAll.getData(addressOperationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it.skip('should not call transferToMany on releasePayment if called not from jobController', () => {
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

  it('should check auth on releasePayment call', () => {
    const caller = accounts[0];
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentProcessor.address,
        paymentProcessor.contract.releasePayment.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: caller}))
    .then(assertExpectations());
  });

  it.skip('should return transferWithFee fail on lockPayment', () => {
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

  it('should return transferWithFee fail on lockPayment', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    const result = 0;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, addressOperationId, value, 0, 0, erc20ContractAddress), result))
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

  it.skip('should return transferToMany fail on releasePayment', () => {
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

  it('should return transferAll fail on releasePayment', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    const result = 0;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferAll.getData(addressOperationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress), result))
    .then(() => paymentProcessor.releasePayment.call(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(asserts.isFalse);
  });

  it.skip('should return transferToMany success on releasePayment', () => {
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

  it('should return transferAll success on releasePayment', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    const result = 1;
    return Promise.resolve()
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferAll.getData(addressOperationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress), result))
    .then(() => paymentProcessor.releasePayment.call(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
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

  it.skip('should call transferWithFee on lockPayment if serviceMode is enabled and operation is approved', () => {
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

  it('should check auth on approve call', () => {
    const caller = accounts[5];
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentProcessor.address,
        paymentProcessor.contract.approve.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.approve(operationId, {from: caller}))
    .then(assertExpectations());
  });

  it('should call transferWithFee on lockPayment if serviceMode is enabled and operation is approved', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.approve(operationId))
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, addressOperationId, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations())
    .then(() => paymentProcessor.approved(operationId))
    .then(asserts.isFalse);
  });

  it.skip('should not call transferToMany on releasePayment if serviceMode is enabled', () => {
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

  it('should not call transferAll on releasePayment if serviceMode is enabled', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it.skip('should call transferToMany on releasePayment if serviceMode is enabled and operation is approved', () => {
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
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations())
    .then(() => paymentProcessor.approved(operationId))
    .then(asserts.isFalse);
  });

  it('should call transferAll on releasePayment if serviceMode is enabled and operation is approved', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.approve(operationId))
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferAll.getData(addressOperationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations())
    .then(() => paymentProcessor.approved(operationId))
    .then(asserts.isFalse);
  });

  it.skip('should call transferWithFee on lockPayment if serviceMode is disabled', () => {
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

  it('should call transferWithFee on lockPayment if serviceMode is disabled', () => {
    const payer = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode())
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferWithFee.getData(payer, addressOperationId, value, 0, 0, erc20ContractAddress), 1))
    .then(() => paymentProcessor.lockPayment(operationId, payer, value, erc20ContractAddress, {from: jobControllerAddress}))
    .then(assertExpectations());
  });

  it.skip('should call transferToMany on releasePayment if serviceMode is disabled', () => {
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

  it('should call transferAll on releasePayment if serviceMode is disabled', () => {
    const receiver = accounts[1];
    const change = accounts[2];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const feeFromValue = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000';
    const additionalFee = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000';
    const erc20ContractAddress = '0xffffffffffffffffffffffffffffffffffffff00';
    const operationId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00';
    const addressOperationId = '0xffffffffffffffffffffffffffffffffffffff00';
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => paymentProcessor.disableServiceMode())
    .then(() => mock.expect(paymentProcessor.address, 0, paymentGateway.transferAll.getData(addressOperationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress), 1))
    .then(() => paymentProcessor.releasePayment(operationId, receiver, value, change, feeFromValue, additionalFee, erc20ContractAddress, {from: jobControllerAddress}))
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
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        notOwner,
        paymentProcessor.address,
        paymentProcessor.contract.enableServiceMode.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.enableServiceMode({from: notOwner}))
    .then(assertExpectations())
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isFalse);
  });

  it('should not allow to disable service mode if called not by owner', () => {
    const notOwner = accounts[1];
    return Promise.resolve()
    .then(() => paymentProcessor.enableServiceMode())
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentProcessor.address,
      0,
      roles2LibraryInterface.canCall.getData(
        notOwner,
        paymentProcessor.address,
        paymentProcessor.contract.disableServiceMode.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentProcessor.disableServiceMode({from: notOwner}))
    .then(assertExpectations())
    .then(() => paymentProcessor.serviceMode())
    .then(asserts.isTrue);
  });
});
