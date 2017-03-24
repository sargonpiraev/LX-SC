pragma solidity 0.4.8;

import './StorageInterface.sol';
import './Owned.sol';

contract Emitter {
    function emitAddRole(address _user, bytes32 _role);
    function emitRemoveRole(address _user, bytes32 _role);
}

contract UserManager is Owned {
    using StorageInterface for StorageInterface.Config;
    using StorageInterface for StorageInterface.Address;
    using StorageInterface for StorageInterface.Mapping;
    
    StorageInterface.Config store;
    
    StorageInterface.Address eventsHistory;
    StorageInterface.Mapping roles;
    
    function UserManager(Storage _store, bytes32 _crate) {
        store.init(_store, _crate);
        eventsHistory.init('eventsHistory');
        roles.init('roles');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (store.get(eventsHistory) != 0x0) {
            return false;
        }
        return store.set(eventsHistory, _eventsHistory);
    }

    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return StorageInterface.toBool(store.get(roles, bytes32(_user), _role));
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
        return store.set(roles, bytes32(_user), _role, StorageInterface.toBytes32(_status));
    }

    function _emitAddRole(address _user, bytes32 _role) internal {
        Emitter(store.get(eventsHistory)).emitAddRole(_user, _role);
    }

    function _emitRemoveRole(address _user, bytes32 _role) internal {
        Emitter(store.get(eventsHistory)).emitRemoveRole(_user, _role);
    }
}
