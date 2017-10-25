"use strict";
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.deploy(PaymentProcessor, Roles2Library.address)
    .then(() => console.log("[Migration] PaymentProcessor #deployed"))
};
