const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const Listener = artifacts.require('./Listener.sol');
const ERC20Interface = artifacts.require('./ERC20Interface.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const EventsHistory = artifacts.require('./EventsHistory.sol');

contract('PaymentGateway', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let eventsHistory;
  let erc20Library;
  let erc20Interface = web3.eth.contract(ERC20Interface.abi).at('0x0');
  let listener;
  let paymentGateway;
  let paymentProcessor = accounts[5];

  const getTransferFromData = (sender, receiver, value) => {
    return web3.sha3(erc20Interface.transferFrom.getData(sender, receiver, value), {encoding: 'hex'});
  };

  const assertTransferFromCallData = (actualData, sender, receiver, value) => {
    assert.equal(actualData, getTransferFromData(sender, receiver, value));
  };

  const denyTransferFromCall = (sender, receiver, value) => {
    return listener.addDeny(getTransferFromData(sender, receiver, value));
  };

  before('setup', () => {
    return Storage.deployed()
    .then(instance => storage = instance)
    .then(() => ManagerMock.deployed())
    .then(instance => storage.setManager(instance.address))
    .then(() => Listener.deployed())
    .then(instance => listener = instance)
    .then(() => ERC20Library.deployed())
    .then(instance => erc20Library = instance)
    .then(() => PaymentGateway.deployed())
    .then(instance => paymentGateway = instance)
    .then(() => EventsHistory.deployed())
    .then(instance => eventsHistory = instance)
    .then(() => erc20Library.setupEventsHistory(eventsHistory.address))
    .then(() => erc20Library.addContract(listener.address))
    .then(() => paymentGateway.setupEventsHistory(eventsHistory.address))
    .then(() => paymentGateway.setERC20Library(erc20Library.address))
    .then(() => paymentGateway.setPaymentProcessor(paymentProcessor))
    .then(() => eventsHistory.addVersion(paymentGateway.address, '_', '_'))
    .then(reverter.snapshot);
  });

  it('should set fee address', () => {
    const feeAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.getFeeAddress())
    .then(asserts.equal(feeAddress));
  });

  it('should not set fee address if not allowed', () => {
    const feeAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress, {from: accounts[1]}))
    .then(() => paymentGateway.getFeeAddress())
    .then(asserts.equal('0x0000000000000000000000000000000000000000'));
  });

  it('should set payment processor', () => {
    const newPaymentProcessor = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setPaymentProcessor(newPaymentProcessor))
    .then(() => paymentGateway.getPaymentProcessor())
    .then(asserts.equal(newPaymentProcessor));
  });

  it('should not set payment processor if not allowed', () => {
    const newPaymentProcessor = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setPaymentProcessor(newPaymentProcessor, {from: accounts[1]}))
    .then(() => paymentGateway.getPaymentProcessor())
    .then(asserts.equal(paymentProcessor));
  });

  it('should set fee percent', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.getFeePercent(listener.address))
    .then(asserts.equal(feePercent));
  });

  it('should not set fee percent if not allowed', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent, {from: accounts[1]}))
    .then(() => paymentGateway.getFeePercent(listener.address))
    .then(asserts.equal(0));
  });

  it('should not set fee percent for not supported contract', () => {
    const feePercent = 1333;
    const notSupported = '0x00000000000000000000000000000000000000ff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(notSupported, feePercent))
    .then(() => paymentGateway.getFeePercent(notSupported))
    .then(asserts.equal(0));
  });

  it('should set fee percent for different contracts', () => {
    const feePercent = 1333;
    const feePercent2 = 1;
    const supported2 = '0x00000000000000000000000000000000000000ff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(supported2))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.setFeePercent(supported2, feePercent2))
    .then(() => paymentGateway.getFeePercent(listener.address))
    .then(asserts.equal(feePercent))
    .then(() => paymentGateway.getFeePercent(supported2))
    .then(asserts.equal(feePercent2));
  });

  it('should emit FeeSet event in EventsHistory', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, eventsHistory.address);
      assert.equal(result.logs[0].args.contractAddress, listener.address);
      assert.equal(result.logs[0].args.feePercent, 1333);
      assert.equal(result.logs[0].args.version, 1);
    });
  });

  it('should not set fee percent higher than or equal to 100%', () => {
    const feePercent = 10000;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.getFeePercent(listener.address))
    .then(asserts.equal(0))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent - 1))
    .then(() => paymentGateway.getFeePercent(listener.address))
    .then(asserts.equal(feePercent - 1));
  });

  it('should call transferFrom on asset', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(1))
    .then(() => listener.getFromStart(0))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, receiver, value);
    });
  });

  it('should not call transferFrom on asset if not allowed', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address))
    .then(() => listener.getCount())
    .then(asserts.equal(0));
  });

  it('should not take fee if feePercent is 0', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(1))
    .then(() => listener.getFromStart(0))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, receiver, value);
    });
  });

  it('should not take fee if feeAddress is not set', () => {
    const feePercent = 100;
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(1))
    .then(() => listener.getFromStart(0))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, receiver, value);
    });
  });

  it('should take fee', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const fee = 10;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(2))
    .then(() => listener.getFromStart(0))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, receiver, value);
    })
    .then(() => listener.getFromStart(1))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, feeAddress, fee);
    });
  });

  it('should take fee round up', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 801;
    const fee = 9;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(2))
    .then(() => listener.getFromStart(1))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, feeAddress, fee);
    });
  });

  it('should not take fee if transfer failed', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const fee = 10;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => denyTransferFromCall(sender, receiver, value))
    .then(() => paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor}))
    .then(() => listener.getCount())
    .then(asserts.equal(1))
    .then(() => listener.getFromStart(0))
    .then(([callFrom, callValue, callData]) => {
      assert.equal(callFrom, paymentGateway.address);
      assert.equal(callValue, 0);
      assertTransferFromCallData(callData, sender, receiver, value);
    })
    .then(() => listener.deniesExpected(getTransferFromData(sender, receiver, value)))
    .then(asserts.equal(0))
  });

  it('should throw if taking fee failed', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const fee = 10;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(listener.address, feePercent))
    .then(() => denyTransferFromCall(sender, feeAddress, fee))
    .then(() => asserts.throws(paymentGateway.transfer(sender, receiver, value, listener.address, {from: paymentProcessor})));
  });
});
