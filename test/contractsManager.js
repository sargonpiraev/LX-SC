const ContractsManager = artifacts.require('./ContractsManager.sol');

const MultiEventsHistory = artifacts.require('./MultiEventsHistory.sol');
const BalanceHolder = artifacts.require('./BalanceHolder.sol');
const Recovery = artifacts.require('./Recovery.sol');
const ERC20Library = artifacts.require('./ERC20Library.sol');
const RatingsAndReputationLibrary = artifacts.require('./RatingsAndReputationLibrary.sol');
const IPFSLibrary = artifacts.require('./IPFSLibrary.sol');
const SkillsLibrary = artifacts.require('./SkillsLibrary.sol');
const UserFactory = artifacts.require('./UserFactory.sol');
const UserLibrary = artifacts.require('./UserLibrary.sol');
const PaymentGateway = artifacts.require('./PaymentGateway.sol');
const PaymentProcessor = artifacts.require('./PaymentProcessor.sol');
const JobController = artifacts.require('./JobController.sol');
const BoardController = artifacts.require('./BoardController.sol');

contract('Contracts Manager', function(accounts) {
    let contractsManager;
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    before('setup', async () => {
        contractsManager = await ContractsManager.deployed();
    });

    context("Setup tests", function(){
        it("can provide MultiEventsHistory address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("MultiEventsHistory"), MultiEventsHistory.address);
        });

        it("can provide BalanceHolder address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("BalanceHolder"), BalanceHolder.address);
        });

        it("can provide Recovery address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("Recovery"), Recovery.address);
        });

        it("can provide ERC20Library address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("ERC20Library"), ERC20Library.address);
        });

        it("can provide RatingsAndReputationLibrary address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("RatingsAndReputationLibrary"), RatingsAndReputationLibrary.address);
        });

        it("can provide IPFSLibrary address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("IPFSLibrary"), IPFSLibrary.address);
        });

        it("can provide SkillsLibrary address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("SkillsLibrary"), SkillsLibrary.address);
        });

        it("can provide UserFactory address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("UserFactory"), UserFactory.address);
        });

        it("can provide UserLibrary address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("UserLibrary"), UserLibrary.address);
        });

        it("can provide PaymentGateway address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("PaymentGateway"), PaymentGateway.address);
        });

        it("can provide UserLibrary address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("UserLibrary"), UserLibrary.address);
        });

        it("can provide PaymentProcessor address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("PaymentProcessor"), PaymentProcessor.address);
        });

        it("can provide JobController address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("JobController"), JobController.address);
        });

        it("can provide BoardController address.", async () => {
            assert.equal(await contractsManager.getContractAddressByType("BoardController"), BoardController.address);
        });

        it("doesn't allow a non auth account to change the contract address", async () => {
            assert.isTrue((await contractsManager.addContract.call("0x01", "TEST", {from: accounts[1]})).eq(0));

            await contractsManager.addContract("0x01", "TEST", {from: accounts[1]});
            assert.equal(await contractsManager.getContractAddressByType("TEST"), zeroAddress);
        });

        it("allows a auth account to change the contract address", async () => {
            assert.isTrue((await contractsManager.addContract.call("0x01", "TEST")).eq(1));

            await contractsManager.addContract(accounts[2], "TEST");
            assert.equal(await contractsManager.getContractAddressByType("TEST"), accounts[2]);
        });
    });
});