"use strict";
const SkillsLibrary = artifacts.require('./SkillsLibrary.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');

module.exports = deployer => {
    deployer.deploy(SkillsLibrary, Storage.address, 'SkillsLibrary', Roles2Library.address)
    .then(() => console.log("[Migration] SkillsLibrary #deployed"))
};
