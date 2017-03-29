pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryUser.sol';

contract RolesLibrary is EventsHistoryUser, Owned {
    StorageInterface.Set roles;
    
    function RolesLibrary(Storage _store, bytes32 _crate) EventsHistoryUser(_store, _crate) {
        roles.init('roles');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function count() constant returns(uint) {
        return store.count(roles);
    }

    function include(bytes32 _role) constant returns(bool) {
        return store.include(roles, _role);
    }

    function getRoles() constant returns(bytes32[]) {
        return store.get(roles);
    }

    function getRole(uint _index) constant returns(bytes32) {
        return store.get(roles, _index);
    }

    function addRole(bytes32 _role) onlyContractOwner() returns(bool) {
        store.add(roles, _role);
        _emitAddRole(_role);
        return true;
    }

    function removeRole(bytes32 _role) onlyContractOwner() returns(bool) {
        store.remove(roles, _role);
        _emitRemoveRole(_role);
        return true;
    }

    function _emitAddRole(bytes32 _role) internal {
        RolesLibrary(getEventsHistory()).emitAddRole(_role);
    }

    function _emitRemoveRole(bytes32 _role) internal {
        RolesLibrary(getEventsHistory()).emitRemoveRole(_role);
    }

    event AddRole(bytes32 indexed role, uint version);
    event RemoveRole(bytes32 indexed role, uint version);
    
    function emitAddRole(bytes32 _role) {
        AddRole(_role, _getVersion());
    }

    function emitRemoveRole(bytes32 _role) {
        RemoveRole(_role, _getVersion());
    }
}
