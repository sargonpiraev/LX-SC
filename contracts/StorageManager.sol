pragma solidity ^0.4.8;

import './Owned.sol';

contract StorageManager is Owned {

	mapping (address => bytes32[]) internal approvedContracts;
	event accessGiven(address _actor, bytes32 _role);
	event accessBlocked(address _actor, bytes32 _role);


	function isAllowed(address _actor, bytes32 _role) constant returns(bool){
		bytes32[] roles = approvedContracts[_actor];
		for (uint i = 0; i < roles.length; i++){
			if (roles[i] == _role){
				return true;
			}
		}
		return false;
	}

	function giveAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool){
		if (isAllowed(_actor, _role)){
			return true;
		} else {
			approvedContracts[_actor][approvedContracts[_actor].length] = _role;
			accessGiven(_actor, _role);
			return true;
		}
		return false;
    }

	function blockAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool){
		bytes32[] roles = approvedContracts[_actor];
		bool i = false;
		for (uint j = 0; j < roles.length; j++){
			if (roles[j] == _role){
				i = true;	
			}
			if (i && j-2 == roles.length){
				roles[j] = roles[j+1];
			}
		}
		delete roles[roles.length-1];
    	roles.length--;
    	accessBlocked(_actor, _role);
		return true;
	}



}
