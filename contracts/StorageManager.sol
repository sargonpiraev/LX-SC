pragma solidity 0.4.8;

import './Roles2LibraryAdapter.sol';
import './MultiEventsHistoryAdapter.sol';

contract StorageManager is MultiEventsHistoryAdapter, Roles2LibraryAdapter {
    mapping(address => mapping(bytes32 => bool)) internal approvedContracts;
    event AccessGiven(address indexed self, address actor, bytes32 role);
    event AccessBlocked(address indexed self, address actor, bytes32 role);

    function StorageManager(address _roles2Library) Roles2LibraryAdapter(_roles2Library) {}

    function setupEventsHistory(address _eventsHistory) auth() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function giveAccess(address _actor, bytes32 _role) auth() returns(bool) {
        approvedContracts[_actor][_role] = true;
        _emitAccessGiven(_actor, _role);
        return true;
    }

    function blockAccess(address _actor, bytes32 _role) auth() returns(bool) {
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
        AccessGiven(_self(), _user, _role);
    }

    function emitAccessBlocked(address _user, bytes32 _role) {
        AccessBlocked(_self(), _user, _role);
    }
}
