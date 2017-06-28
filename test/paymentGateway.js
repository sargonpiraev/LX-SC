const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Storage = artifacts.require('./Storage.sol');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const ManagerMock = artifacts.require('./ManagerMock.sol');
const FakeCoin = artifacts.require('./FakeCoin.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const ERC20Interface = artifacts.require('./ERC20Interface.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const Mock = artifacts.require('./Mock.sol');

const helpers = require('./helpers/helpers');


contract('PaymentGateway', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let storage;
  let multiEventsHistory;
  let erc20Library;
  let erc20Interface = web3.eth.contract(ERC20Interface.abi).at('0x0');
  let fakeCoin;
  let paymentGateway;
  let balanceHolder;
  let paymentProcessor = accounts[5];
  let roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
  let mock;

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

  before('setup', () => {
    return Mock.deployed()
    .then(instance => mock = instance)
    .then(() => ignoreAuth())
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
    .then(() => MultiEventsHistory.deployed())
    .then(instance => multiEventsHistory = instance)
    .then(() => erc20Library.setupEventsHistory(multiEventsHistory.address))
    .then(() => erc20Library.addContract(fakeCoin.address))
    .then(() => paymentGateway.setupEventsHistory(multiEventsHistory.address))
    .then(() => paymentGateway.setERC20Library(erc20Library.address))
    //.then(() => paymentGateway.setPaymentProcessor(paymentProcessor))
    .then(() => paymentGateway.setBalanceHolder(balanceHolder.address))
    //.then(() => balanceHolder.setPaymentGateway(paymentGateway.address))
    .then(() => multiEventsHistory.authorize(paymentGateway.address))
    .then(reverter.snapshot);
  });

  it('should check auth on setup event history', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentGateway.address,
        paymentGateway.contract.setupEventsHistory.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.setupEventsHistory(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting ERC20 library', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentGateway.address,
        paymentGateway.contract.setERC20Library.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.setERC20Library(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should check auth on setting balance holder', () => {
    const caller = accounts[1];
    const newAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentGateway.address,
        paymentGateway.contract.setBalanceHolder.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.setBalanceHolder(newAddress, {from: caller}))
    .then(assertExpectations());
  });

  it('should set fee address', () => {
    const feeAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.getFeeAddress())
    .then(asserts.equal(feeAddress));
  });

  it.skip('should not set fee address if not allowed', () => {
    const feeAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress, {from: accounts[1]}))
    .then(() => paymentGateway.getFeeAddress())
    .then(asserts.equal('0x0000000000000000000000000000000000000000'));
  });

  it('should check auth on setting fee', () => {
    const caller = accounts[1];
    const feeAddress = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentGateway.address,
        paymentGateway.contract.setFeeAddress.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.setFeeAddress(feeAddress, {from: caller}))
    .then(assertExpectations())
    .then(() => paymentGateway.getFeeAddress())
    .then(asserts.equal('0x0000000000000000000000000000000000000000'));
  });

  it('should set fee percent', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(feePercent));
  });

  it.skip('should not set fee percent if not allowed', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address, {from: accounts[1]}))
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(0));
  });

  it('should check auth on setting fee percent', () => {
    const caller = accounts[1];
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        caller,
        paymentGateway.address,
        paymentGateway.contract.setFeePercent.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address, {from: caller}))
    .then(assertExpectations())
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(0));
  });

  it('should not set fee percent for not supported contract', () => {
    const feePercent = 1333;
    const notSupported = '0x00000000000000000000000000000000000000ff';
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, notSupported))
    .then(() => paymentGateway.getFeePercent(notSupported))
    .then(asserts.equal(0));
  });

  it('should set fee percent for different contracts', () => {
    const feePercent = 1333;
    const feePercent2 = 1;
    const supported2 = '0x00000000000000000000000000000000000000ff';
    return Promise.resolve()
    .then(() => erc20Library.addContract(supported2))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => paymentGateway.setFeePercent(feePercent2, supported2))
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(feePercent))
    .then(() => paymentGateway.getFeePercent(supported2))
    .then(asserts.equal(feePercent2));
  });

  it('should emit FeeSet event in MultiEventsHistory', () => {
    const feePercent = 1333;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.feePercent, 1333);
      assert.equal(result.logs[0].args.self, paymentGateway.address);
    });
  });

  it('should not set fee percent higher than or equal to 100%', () => {
    const feePercent = 10000;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => paymentGateway.setFeePercent(feePercent - 1, fakeCoin.address))
    .then(() => paymentGateway.getFeePercent(fakeCoin.address))
    .then(asserts.equal(feePercent - 1));
  });

  it('should deposit', () => {
    const sender = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(value))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(0));
  });

  it('should emit Deposited event in MultiEventsHistory', () => {
    const sender = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'Deposited');
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.by, sender);
      assert.equal(result.logs[0].args.value.valueOf(), value);
    });
  });

  it('should deposit only credited amount', () => {
    const sender = accounts[6];
    const value = 1000;
    const fee = 100;
    const result = 900;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.setFee(fee))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(0));
  });

  it('should not deposit if not supported', () => {
    const sender = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => erc20Library.removeContract(fakeCoin.address))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(0))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(value));
  });

  it('should not deposit if balanceHolder.deposit failed', () => {
    const sender = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(0));
  });

  it('should not deposit if overflow happened', () => {
    const sender = accounts[6];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.mint(sender, 1))
    .then(() => asserts.throws(paymentGateway.deposit(1, fakeCoin.address, {from: sender})));
  });

  it('should not deposit if overflow happened in ERC20 contract', () => {
    const sender = accounts[6];
    const receiver = accounts[7];
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(receiver, 1))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => asserts.throws(paymentGateway.deposit(1, fakeCoin.address, {from: receiver})));
  });

  it('should withdraw', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(withdraw));
  });

  it('should emit Withdrawn event in MultiEventsHistory', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender}))
    .then(result => {
      assert.equal(result.logs.length, 1);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'Withdrawn');
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.by, sender);
      assert.equal(result.logs[0].args.value.valueOf(), withdraw);
    });
  });

  it('should withdraw whole charged amount', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 300;
    const fee = 100;
    const result = 600;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.setFee(fee))
    .then(() => fakeCoin.setFeeFromPayer())
    .then(() => paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(withdraw));
  });

  it('should withdraw even if not supported', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => erc20Library.removeContract(fakeCoin.address))
    .then(() => paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(withdraw));
  });

  it('should not withdraw if balanceHolder.withdraw failed', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.transferFrom(balanceHolder.address, '0x0', result + 1))
    .then(() => paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(value))
    .then(() => fakeCoin.balanceOf(sender))
    .then(asserts.equal(0));
  });

  it('should not withdraw if whole charged amount is greater than user balance', () => {
    const sender = accounts[6];
    const value = 1000;
    const withdraw = 1000;
    const fee = 100;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.mint(balanceHolder.address, fee))
    .then(() => fakeCoin.setFee(fee))
    .then(() => fakeCoin.setFeeFromPayer())
    .then(() => asserts.throws(paymentGateway.withdraw(withdraw, fakeCoin.address, {from: sender})));
  });

  it('should perform internal transfer', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, value, fakeCoin.address, {from: paymentProcessor}))
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(value))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should emit Transferred event in MultiEventsHistory on internal transfer', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 300;
    const result = 697;
    const fee = 3;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor}))
    .then(result => {
      assert.equal(result.logs.length, 2);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'Transferred');
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.from, sender);
      assert.equal(result.logs[0].args.to, receiver);
      assert.equal(result.logs[0].args.value.valueOf(), transfer);
      assert.equal(result.logs[1].address, multiEventsHistory.address);
      assert.equal(result.logs[1].event, 'Transferred');
      assert.equal(result.logs[1].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[1].args.from, sender);
      assert.equal(result.logs[1].args.to, feeAddress);
      assert.equal(result.logs[1].args.value.valueOf(), fee);
    });
  });

  it('should check auth on internal transfer', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => ignoreAuth(false))
    .then(() => mock.expect(
      paymentGateway.address,
      0,
      roles2LibraryInterface.canCall.getData(
        sender,
        paymentGateway.address,
        paymentGateway.contract.transfer.getData().slice(0, 10)
      ), 0)
    )
    .then(() => paymentGateway.transfer(sender, receiver, value, fakeCoin.address, {from: sender}))
    .then(assertExpectations())
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(value))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should not perform internal transfer if not enough balance', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => asserts.throws(paymentGateway.transfer(sender, receiver, value + 1, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should not perform internal transfer if overflow happened', () => {
    const sender = accounts[6];
    const receiver = accounts[7];
    const receiverBalance = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const value = 1;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(receiver, receiverBalance))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.transferFrom(balanceHolder.address, '0x0', value))
    .then(() => paymentGateway.deposit(receiverBalance, fakeCoin.address, {from: receiver}))
    .then(() => asserts.throws(paymentGateway.transfer(sender, receiver, value, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should perform internal transfer to many', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], 0, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverResult))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Result))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should emit Transferred events in MultiEventsHistory on internal transfer to many', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 200;
    const additionalFee = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 580;
    const fee = 120;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, additionalFee, fakeCoin.address, {from: paymentProcessor}))
    .then(result => {
      assert.equal(result.logs.length, 3);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'Transferred');
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.from, sender);
      assert.equal(result.logs[0].args.to, receiver);
      assert.equal(result.logs[0].args.value.valueOf(), receiverValue);

      assert.equal(result.logs[1].address, multiEventsHistory.address);
      assert.equal(result.logs[1].event, 'Transferred');
      assert.equal(result.logs[1].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[1].args.from, sender);
      assert.equal(result.logs[1].args.to, receiver2);
      assert.equal(result.logs[1].args.value.valueOf(), receiver2Value);

      assert.equal(result.logs[2].address, multiEventsHistory.address);
      assert.equal(result.logs[2].event, 'Transferred');
      assert.equal(result.logs[2].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[2].args.from, sender);
      assert.equal(result.logs[2].args.to, feeAddress);
      assert.equal(result.logs[2].args.value.valueOf(), fee);
    });
  });

  it('should check auth on internal transfer to many', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 0;
    const receiver2Result = 0;
    const result = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => ignoreAuth(false))
    .then(() => {
        const expectedSig = helpers.getSig("transferToMany(address,address[],uint256[],uint256,uint256,address)");
        return mock.expect(
          paymentGateway.address,
          0,
          roles2LibraryInterface.canCall.getData(
            sender,
            paymentGateway.address,
            expectedSig
          ), 0)
      }
    )
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], 0, 0, fakeCoin.address, {from: sender}))
    .then(assertExpectations())
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverResult))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Result))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should not perform internal transfer to many if not enough balance', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => asserts.throws(paymentGateway.transferToMany(sender, [receiver, receiver2], [value, 1], 0, 0, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should not perform internal transfer to many if input arrays have diff length', () => {
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 0;
    const receiver2Result = 0;
    const result = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue], 0, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverResult))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Result))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should not take fee percent on internal transfer to many if feePercent is 0', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 700;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, 0))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should not take fee percent on internal transfer to many if feeAddress is not set', () => {
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 700;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should take fee percent on internal transfer to many', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const fee = 10;
    const result = 690;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, fee))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should take fee percent from specified value on internal transfer to many', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const feeFrom = 100;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const fee = 1;
    const result = 699;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], feeFrom, 0, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, fee))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should not perform internal transfer to many if cannot take fee percent', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 300;
    const receiverValue = 100;
    const receiver2Value = 200;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => asserts.throws(paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, 0, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should not take additional fee on internal transfer to many if feeAddress is not set', () => {
    const additionalFee = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 700;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], 0, additionalFee, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should take additional fee on internal transfer to many', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const additionalFee = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 600;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], 0, additionalFee, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, additionalFee))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should not perform internal transfer to many if cannot take additional fee', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const additionalFee = 1;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 300;
    const receiverValue = 100;
    const receiver2Value = 200;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => asserts.throws(paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], 0, additionalFee, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should take additional fee and fee percent on internal transfer to many', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 200;
    const additionalFee = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const receiver2 = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const receiverValue = 100;
    const receiver2Value = 200;
    const receiverResult = 100;
    const receiver2Result = 200;
    const result = 580;
    const fee = 120;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transferToMany(sender, [receiver, receiver2], [receiverValue, receiver2Value], value, additionalFee, fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverValue))
    .then(assertInternalBalance(receiver2, fakeCoin.address, receiver2Value))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, fee))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });

  it('should perform internal transfer from many', () => {
    const sender = accounts[6];
    const sender2 = accounts[7];
    const receiver = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const value2 = 100;
    const totalValue = 1100;
    const senderValue = 200;
    const sender2Value = 70;
    const receiverResult = 270;
    const result = 800;
    const result2 = 30;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(sender2, value2))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.deposit(value2, fakeCoin.address, {from: sender2}))
    .then(() => paymentGateway.transferFromMany([sender, sender2], receiver, [senderValue, sender2Value], fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(sender2, fakeCoin.address, result2))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverResult))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, totalValue));
  });

  it('should emit Transferred events in MultiEventsHistory on internal transfer from many', () => {
    const sender = accounts[6];
    const sender2 = accounts[7];
    const receiver = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const value2 = 100;
    const totalValue = 1100;
    const senderValue = 200;
    const sender2Value = 70;
    const receiverResult = 270;
    const result = 800;
    const result2 = 30;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(sender2, value2))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.deposit(value2, fakeCoin.address, {from: sender2}))
    .then(() => paymentGateway.transferFromMany([sender, sender2], receiver, [senderValue, sender2Value], fakeCoin.address, {from: paymentProcessor}))
    .then(result => {
      assert.equal(result.logs.length, 2);
      assert.equal(result.logs[0].address, multiEventsHistory.address);
      assert.equal(result.logs[0].event, 'Transferred');
      assert.equal(result.logs[0].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[0].args.from, sender);
      assert.equal(result.logs[0].args.to, receiver);
      assert.equal(result.logs[0].args.value.valueOf(), senderValue);

      assert.equal(result.logs[1].address, multiEventsHistory.address);
      assert.equal(result.logs[1].event, 'Transferred');
      assert.equal(result.logs[1].args.contractAddress, fakeCoin.address);
      assert.equal(result.logs[1].args.from, sender2);
      assert.equal(result.logs[1].args.to, receiver);
      assert.equal(result.logs[1].args.value.valueOf(), sender2Value);
    });
  });

  it('should not perform internal transfer from many if not enough balance', () => {
    const sender = accounts[6];
    const sender2 = accounts[7];
    const receiver = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const value2 = 100;
    const senderValue = 1100;
    const sender2Value = 70;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(sender2, value2))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.deposit(value2, fakeCoin.address, {from: sender2}))
    .then(() => asserts.throws(paymentGateway.transferFromMany([sender, sender2], receiver, [senderValue, sender2Value], fakeCoin.address, {from: paymentProcessor})));
  });

  it('should not perform internal transfer from many if arrays length is different', () => {
    const sender = accounts[6];
    const sender2 = accounts[7];
    const receiver = '0xffffffffffffffffffffffffffffffffffff0000';
    const value = 1000;
    const value2 = 100;
    const totalValue = 1100;
    const senderValue = 200;
    const sender2Value = 70;
    const receiverResult = 0;
    const result = value;
    const result2 = value2;
    return Promise.resolve()
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(sender2, value2))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.deposit(value2, fakeCoin.address, {from: sender2}))
    .then(() => paymentGateway.transferFromMany([sender, sender2], receiver, [senderValue], fakeCoin.address, {from: paymentProcessor}))
    .then(assertInternalBalance(sender, fakeCoin.address, result))
    .then(assertInternalBalance(sender2, fakeCoin.address, result2))
    .then(assertInternalBalance(receiver, fakeCoin.address, receiverResult))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, totalValue));
  });

  it('should not take fee if feePercent is 0', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor}))
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(transfer))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => paymentGateway.getBalance(feeAddress, fakeCoin.address))
    .then(asserts.equal(0))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should not take fee if feeAddress is not set', () => {
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 300;
    const result = 700;
    return Promise.resolve()
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor}))
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(transfer))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should take fee', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 300;
    const result = 697;
    const fee = 3;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor}))
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(transfer))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => paymentGateway.getBalance(feeAddress, fakeCoin.address))
    .then(asserts.equal(fee))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should take fee round up', () => {
    const feeAddress = '0x00ffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 301;
    const result = 695;
    const fee = 4;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor}))
    .then(() => paymentGateway.getBalance(receiver, fakeCoin.address))
    .then(asserts.equal(transfer))
    .then(() => paymentGateway.getBalance(sender, fakeCoin.address))
    .then(asserts.equal(result))
    .then(() => paymentGateway.getBalance(feeAddress, fakeCoin.address))
    .then(asserts.equal(fee))
    .then(() => fakeCoin.balanceOf(balanceHolder.address))
    .then(asserts.equal(value));
  });

  it('should not take fee if transfer failed', () => {
    // Covered in `should not perform internal transfer *`
  });

  it('should throw if taking fee failed (overflows)', () => {
    const feeAddress = accounts[7];
    const feeBalance = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const feePercent = 100;
    const sender = accounts[6];
    const receiver = '0xffffffffffffffffffffffffffffffffffffff00';
    const value = 1000;
    const transfer = 100;
    const result = 899;
    const fee = 1;
    return Promise.resolve()
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.setFeePercent(feePercent, fakeCoin.address))
    .then(() => fakeCoin.mint(sender, value))
    .then(() => fakeCoin.mint(feeAddress, feeBalance))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: sender}))
    .then(() => fakeCoin.transferFrom(balanceHolder.address, '0x0', value))
    .then(() => paymentGateway.deposit(feeBalance, fakeCoin.address, {from: feeAddress}))
    .then(() => asserts.throws(paymentGateway.transfer(sender, receiver, transfer, fakeCoin.address, {from: paymentProcessor})));
  });

  it('should forward collected fee', () => {
    const feeAddress = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(feeAddress, value))
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: feeAddress}))
    .then(() => paymentGateway.forwardFee(value, fakeCoin.address))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, 0))
    .then(assertExternalBalance(feeAddress, fakeCoin.address, value))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, 0));
  });

  it('should not forward collected fee if feeAddress is not set', () => {
    const feeAddress = accounts[6];
    const value = 1000;
    return Promise.resolve()
    .then(() => fakeCoin.mint(feeAddress, value))
    .then(() => paymentGateway.setFeeAddress(feeAddress))
    .then(() => paymentGateway.deposit(value, fakeCoin.address, {from: feeAddress}))
    .then(() => paymentGateway.setFeeAddress('0x0'))
    .then(() => paymentGateway.forwardFee(value, fakeCoin.address))
    .then(assertInternalBalance(feeAddress, fakeCoin.address, value))
    .then(assertExternalBalance(feeAddress, fakeCoin.address, 0))
    .then(assertExternalBalance(balanceHolder.address, fakeCoin.address, value));
  });
});
