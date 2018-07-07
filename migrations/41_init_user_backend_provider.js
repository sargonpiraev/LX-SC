"use strict";

const UserBackend = artifacts.require("UserBackend")
const UserBackendProvider = artifacts.require("UserBackendProvider")

module.exports = deployer => {
	deployer.then(async () => {
		const backendProvider = await UserBackendProvider.deployed()
		await backendProvider.setUserBackend(UserBackend.address)

		console.log("[Migration] UserBackendProvider #initialized")
	})
}