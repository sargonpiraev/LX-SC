pragma solidity ^0.4.8;

import './Owned.sol';
import './EventsHistoryUser.sol';


contract StorageManager is EventsHistoryUser, Owned {

	mapping (address => mapping(bytes32 => bool)) internal approvedContracts;
	event AccessGiven(address actor, bytes32 role, uint version);
	event AccessBlocked(address actor, bytes32 role, uint version);

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

	function giveAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool) {
		approvedContracts[_actor][_role] = true;
		_emitAccessGiven(_actor, _role);
		return true;
	}

	function blockAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool) {
		approvedContracts[_actor][_role] = false;
		_emitAccessBlocked(_actor, _role);
		return true;
	}

	function isAllowed(address _actor, bytes32 _role) constant returns(bool) {
		return approvedContracts[_actor][_role];
	}

    function _emitAccessGiven(address _user, bytes32 _role) internal {
        StorageManager(getEventsHistory()).emitAccessGiven(_user, _role);
    }

    function _emitAccessBlocked(address _user, bytes32 _role) internal {
        StorageManager(getEventsHistory()).emitAccessBlocked(_user, _role);
    }
    
    function emitAccessGiven(address _user, bytes32 _role) {
        AccessGiven(_user, _role, _getVersion());
    }

    function emitAccessBlocked(address _user, bytes32 _role) {
        AccessBlocked(_user, _role, _getVersion());
    }

}

