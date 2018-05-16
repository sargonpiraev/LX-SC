"use strict";
const BoardController = artifacts.require('./BoardController.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');
const Storage = artifacts.require('./Storage.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const ContractsManager = artifacts.require('./ContractsManager.sol');

module.exports = (deployer, network) => {
    deployer.then(async () => {
        if (network === "ntr1x") {
            const contractsManager = await ContractsManager.deployed()
            const storageManager = await StorageManager.deployed()
            const multiEventsHistory = await MultiEventsHistory.deployed()
            const boardController = await BoardController.deployed()

            await contractsManager.removeContract(BoardController.address)

            await deployer.deploy(BoardController, Storage.address, 'BoardController', Roles2Library.address, ERC20Library.address)

            await boardController.setupEventsHistory(MultiEventsHistory.address);

            await multiEventsHistory.authorize(BoardController.address)
            await storageManager.giveAccess(BoardController.address, 'BoardController')
            await contractsManager.addContract(BoardController.address, "BoardController");
        }
	})
};
