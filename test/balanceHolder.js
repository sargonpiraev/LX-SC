const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const Mock = artifacts.require('./Mock.sol');
const ERC20Interface = artifacts.require('./ERC20Interface.sol');

contract('BalanceHolder', function(accounts) {
  const reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  const asserts = Asserts(assert);
  let erc20Interface = web3.eth.contract(ERC20Interface.abi).at('0x0');
  let paymentGatewayAddress = accounts[5];
  let mock;
  let balanceHolder;

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
    .then(() => BalanceHolder.deployed())
    .then(instance => balanceHolder = instance)
    .then(() => balanceHolder.setPaymentGateway(paymentGatewayAddress))
    .then(reverter.snapshot);
  });

  it('should call transferFrom on deposit', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transferFrom.getData(sender, balanceHolder.address, value), 0))
    .then(() => balanceHolder.deposit(sender, value, mock.address, {from: paymentGatewayAddress}))
    .then(assertExpectations());
  });

  it('should call transfer on withdraw', () => {
    const receiver = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transfer.getData(receiver, value), 0))
    .then(() => balanceHolder.withdraw(receiver, value, mock.address, {from: paymentGatewayAddress}))
    .then(assertExpectations());
  });

  it('should return transferFrom success on deposit', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const result = '0x0000000000000000000000000000000000000000000000000000000000000001';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transferFrom.getData(sender, balanceHolder.address, value), result))
    .then(() => balanceHolder.deposit.call(sender, value, mock.address, {from: paymentGatewayAddress}))
    .then(asserts.isTrue);
  });

  it('should return transfer success on withdraw', () => {
    const receiver = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const result = '0x0000000000000000000000000000000000000000000000000000000000000001';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transfer.getData(receiver, value), result))
    .then(() => balanceHolder.withdraw.call(receiver, value, mock.address, {from: paymentGatewayAddress}))
    .then(asserts.isTrue);
  });

  it('should return transferFrom fail on deposit', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const result = '0x0000000000000000000000000000000000000000000000000000000000000000';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transferFrom.getData(sender, balanceHolder.address, value), result))
    .then(() => balanceHolder.deposit.call(sender, value, mock.address, {from: paymentGatewayAddress}))
    .then(asserts.isFalse);
  });

  it('should return transfer fail on withdraw', () => {
    const receiver = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const result = '0x0000000000000000000000000000000000000000000000000000000000000000';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transfer.getData(receiver, value), result))
    .then(() => balanceHolder.withdraw.call(receiver, value, mock.address, {from: paymentGatewayAddress}))
    .then(asserts.isFalse);
  });

  it('should not set payment gateway if not allowed', () => {
    const paymentGateway = '0xffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => balanceHolder.setPaymentGateway(paymentGateway, {from: accounts[1]}))
    .then(() => balanceHolder.paymentGateway())
    .then(asserts.equal(paymentGatewayAddress));
  });

  it('should not call transferFrom on deposit if not allowed', () => {
    const sender = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transferFrom.getData(sender, balanceHolder.address, value), 0))
    .then(() => balanceHolder.deposit(sender, value, mock.address, {from: accounts[1]}))
    .then(assertExpectations(1, 0));
  });

  it('should not call transfer on withdraw if not allowed', () => {
    const receiver = '0xffffffffffffffffffffffffffffffffffffffff';
    const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    return Promise.resolve()
    .then(() => mock.expect(balanceHolder.address, 0, erc20Interface.transfer.getData(receiver, value), 0))
    .then(() => balanceHolder.withdraw(receiver, value, mock.address, {from: accounts[1]}))
    .then(assertExpectations(1, 0));
  });
});
