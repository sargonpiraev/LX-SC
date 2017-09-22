"use strict";
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');

const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.deploy(MultiEventsHistory, Roles2Library.address)
    .then(() => console.log("[Migration] MultiEventsHistory #deployed"));
};
