"use strict";
const ContractsManager = artifacts.require('./ContractsManager.sol');
const StorageManager = artifacts.require('./StorageManager.sol');

module.exports = deployer => {
    deployer.then(async () => {
		const storageManager = await StorageManager.deployed()
		await storageManager.giveAccess(ContractsManager.address, "ContractsManager")

        console.log("[Migration] ContractsManager #initialized")
	})
};
