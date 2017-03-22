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

	it('should emit AccessGiven event after access is given', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(result => {
			for (var i = 0; i < result.logs.length; i++) {
   				var log = result.logs[i];

    			if (log.event == "AccessGiven") {
      				return true;
    			}
  			}
  			return false;
		}).then(eventFound => assert.equal(eventFound, true, "AccessGiven event hasn't been emmited."));
	});

	it('should emit AccessBlocked event after access is blocked', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.blockAccess(address, role)
		.then(result => {
			for (var i = 0; i < result.logs.length; i++) {
   				var log = result.logs[i];

    			if (log.event == "AccessBlocked") {
      				return true;
    			}
  			}
  			return false;
		}).then(eventFound => assert.equal(eventFound, true, "AccessBlocked event hasn't been emmited."));
	});


	it('should be accessible', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(() => storageManager.isAllowed(address, role))
		.then(result => assert.equal(result, true));
	});

	it('should not be accessible', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.blockAccess(address, role)
		.then(() => storageManager.isAllowed(address, role))
		.then(result => assert.equal(result, false));
	});

	it('should block allowed access', () => {
		const address = '0xffffffffffffffffffffffffffffffffffffffff';
		const role = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
		return storageManager.giveAccess(address, role)
		.then(() => storageManager.blockAccess(address, role))
		.then(() => storageManager.isAllowed(address, role))
		.then(result => assert.equal(result, false));
	});

});