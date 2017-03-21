const StorageManager = artifacts.require('./StorageManager.sol');

module.exports = deployer => {

	deployer.deploy(StorageManager);

};
