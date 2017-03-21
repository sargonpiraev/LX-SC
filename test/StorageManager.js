const Reverter = require('./helpers/reverter');
const StorageManager = artifacts.require('./StorageManager.sol');

contract('StorageManager', function(accounts) {
	const reverter = new Reverter(web3);
	afterEach('revert', reverter.revert);

	let storageManager;

	before('setup', () => {
		return StorageManager.deployed()
		.then(instance => storageManager = instance)
		.then(reverter.snapshot);
	});

	it('should not be accessible when empty', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.isAllowed(address, role)
		.then(result => assert.equal(result, false));
	});

	it('should give access', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(result => assert.equal(result, true));
	});

	it('should be accessible', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(() => storageManager.isAllowed(address, role))
		.then(result => assert.equal(result, true));
	});

	it('should block access', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.blockAccess(address, role)
		.then(result => assert.equal(result, false));
	});

	it('should not be accessible', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(() => storageManager.blockAccess(address, role))
		.then(() => storageManager.isAllowed(address, role))
		.then(result => assert.equal(result, false));
	});

	
});