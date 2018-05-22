"use strict";
const BoardController = artifacts.require('./BoardController.sol');
const Roles2Library = artifacts.require('./Roles2Library.sol');

module.exports = deployer => {
    deployer.then(async () => {
        const boardController = await BoardController.deployed();
        const roles2Library = await Roles2Library.deployed();

        const ModeratorRole = 10;
        const createBoardSig = boardController.contract.createBoard.getData(0,0,0,0).slice(0,10);
        const closeBoardSig = boardController.contract.closeBoard.getData(0).slice(0,10);

        await roles2Library.addRoleCapability(ModeratorRole, BoardController.address, createBoardSig);
        await roles2Library.addRoleCapability(ModeratorRole, BoardController.address, closeBoardSig);

        console.log("[Migration] Moderator Role #setup")
	})
};
