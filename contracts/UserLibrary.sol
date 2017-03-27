pragma solidity 0.4.8;

import './Owned.sol';
import './Emitter.sol';

contract UserLibrary is Emitter, Owned {
    StorageInterface.Mapping roles;
    
    function UserLibrary(Storage _store, bytes32 _crate) Emitter(_store, _crate) {
        roles.init('roles');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        return _setEventsHistory(_eventsHistory);
    }

    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return store.get(roles, bytes32(_user), _role).toBool();
    }

    function addRole(address _user, bytes32 _role) returns(bool) {
        if (!_setRole(_user, _role, true)) {
            return false;
        }
        _emitAddRole(_user, _role);
        return true;
    }

    function removeRole(address _user, bytes32 _role) returns(bool) {
        if (!_setRole(_user, _role, false)) {
            return false;
        }
        _emitRemoveRole(_user, _role);
        return true;
    }

    function _setRole(address _user, bytes32 _role, bool _status) internal onlyContractOwner() returns(bool) {
        return store.set(roles, bytes32(_user), _role, _status.toBytes32());
    }

    function _emitAddRole(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitAddRole(_user, _role);
    }

    function _emitRemoveRole(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitRemoveRole(_user, _role);
    }

    event AddRole(address indexed user, bytes32 indexed role, uint version);
    event RemoveRole(address indexed user, bytes32 indexed role, uint version);
    
    function emitAddRole(address _user, bytes32 _role) {
        AddRole(_user, _role, _getVersion());
    }

    function emitRemoveRole(address _user, bytes32 _role) {
        RemoveRole(_user, _role, _getVersion());
    }
}
