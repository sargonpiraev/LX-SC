"use strict";
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(PaymentGateway, Storage.address, 'PaymentGateway', Roles2Library.address)
    .then(() => console.log("[Migration] PaymentGateway #deployed"))
};
