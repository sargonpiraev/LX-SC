"use strict";
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');

module.exports = deployer => {
    const PaymentGatewayRole = 33;
    let paymentGateway;
    let balanceHolder;
    let rolesLibrary;

    deployer
    .then(() => Roles2Library.deployed())
    .then(_roles2Library => rolesLibrary = _roles2Library)
    .then(() => BalanceHolder.deployed())
    .then(_balanceHolder => balanceHolder = _balanceHolder)
    .then(() => StorageManager.deployed())
    .then(storageManager => storageManager.giveAccess(PaymentGateway.address, 'PaymentGateway'))
    .then(() => PaymentGateway.deployed())
    .then(_paymentGateway => paymentGateway = _paymentGateway)
    .then(() => paymentGateway.setupEventsHistory(MultiEventsHistory.address))
    .then(() => paymentGateway.setBalanceHolder(BalanceHolder.address))
    .then(() => MultiEventsHistory.deployed())
    .then(multiEventsHistory => multiEventsHistory.authorize(PaymentGateway.address))
    .then(() => {
        let sig = balanceHolder.contract.deposit.getData(0x0,0,0x0).slice(0, 10);
        return rolesLibrary.addRoleCapability(PaymentGatewayRole, BalanceHolder.address, sig);
    })
    .then(() => {
        let sig = balanceHolder.contract.withdraw.getData(0,0,0).slice(0, 10);
        return rolesLibrary.addRoleCapability(PaymentGatewayRole, BalanceHolder.address, sig);
    })
    .then(() => {
        let sig = balanceHolder.contract.withdrawETH.getData(0,0).slice(0, 10);
        return rolesLibrary.addRoleCapability(PaymentGatewayRole, BalanceHolder.address, sig);
    })
    .then(() => rolesLibrary.addUserRole(PaymentGateway.address, PaymentGatewayRole))

    .then(() => console.log("[Migration] PaymentGateway #initialized"))
};
