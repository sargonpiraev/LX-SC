pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryUser.sol';

contract UserLibrary is EventsHistoryUser, Owned {
    StorageInterface.Mapping roles;
    StorageInterface.Set uniqueRoles;
    
    function UserLibrary(Storage _store, bytes32 _crate) EventsHistoryUser(_store, _crate) {
        roles.init('roles');
        uniqueRoles.init('uniqueRoles');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return store.get(roles, bytes32(_user), _role).toBool();
    }

    bytes32[] temp;
    function getUserRoles(address _user) constant returns(bytes32[]) {
        bytes32[] memory uniques = store.get(uniqueRoles);
        temp.length = 0;
        for (uint i = 0; i < uniques.length; i++) {
            if (hasRole(_user, uniques[i])) {
                temp.push(uniques[i]);
            }
        }
        return temp;
    }

    function getRoles() constant returns(bytes32[]) {
        return store.get(uniqueRoles);
    }

    function addRole(address _user, bytes32 _role) returns(bool) {
        if (!_setRole(_user, _role, true)) {
            return false;
        }
        store.add(uniqueRoles, _role);
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
        store.set(roles, bytes32(_user), _role, _status.toBytes32());
        return true;
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
