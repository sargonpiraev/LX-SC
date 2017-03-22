pragma solidity ^0.4.8;

import './Owned.sol';

contract StorageManager is Owned {

	mapping (address => mapping(bytes32 => bool)) internal approvedContracts;
	event AccessGiven(address actor, bytes32 role);
	event AccessBlocked(address actor, bytes32 role);


	function isAllowed(address _actor, bytes32 _role) constant returns(bool){
		return approvedContracts[_actor][_role];
	}

	function giveAccess(address _actor, bytes32 _role) onlyContractOwner() {
		approvedContracts[_actor][_role] = true;
		AccessGiven(_actor, _role);
	}

	function blockAccess(address _actor, bytes32 _role) onlyContractOwner() {
		approvedContracts[_actor][_role] = false;
		AccessBlocked(_actor, _role);
	}

}
