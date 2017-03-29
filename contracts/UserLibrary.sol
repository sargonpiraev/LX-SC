pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryUser.sol';

contract RolesLibraryInterface {
    function count() constant returns(uint);
    function include(bytes32 _role) constant returns(bool);
    function getRole(uint _index) constant returns(bytes32);
}

contract UserLibrary is EventsHistoryUser, Owned {
    StorageInterface.Mapping roles;
    StorageInterface.Address rolesLibrary;
    
    function UserLibrary(Storage _store, bytes32 _crate) EventsHistoryUser(_store, _crate) {
        roles.init('roles');
        rolesLibrary.init('rolesLibrary');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setRolesLibrary(address _rolesLibrary) onlyContractOwner() returns(bool) {
        store.set(rolesLibrary, _rolesLibrary);
    }

    // Will return user role even if it is not present in RolesLibrary.
    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return store.get(roles, bytes32(_user), _role).toBool();
    }

    bytes32[] temp;
    // Will only return roles that are present in RolesLibrary.
    function getUserRoles(address _user) constant returns(bytes32[]) {
        bytes32[] memory uniques = _getRoles();
        temp.length = 0;
        for (uint i = 0; i < uniques.length; i++) {
            if (hasRole(_user, uniques[i])) {
                temp.push(uniques[i]);
            }
        }
        return temp;
    }

    function _getRoles() constant internal returns(bytes32[]) {
        var rolesLib = getRolesLibrary();
        uint count = rolesLib.count();
        bytes32[] memory uniques = new bytes32[](count);
        for (uint i = 0; i < count; i++) {
            uniques[i] = rolesLib.getRole(i);
        }
        return uniques;
    }

    function getRolesLibrary() constant returns(RolesLibraryInterface) {
        return RolesLibraryInterface(store.get(rolesLibrary));
    }

    // Will add role only if it is present in RolesLibrary.
    function addRole(address _user, bytes32 _role) returns(bool) {
        if (!getRolesLibrary().include(_role)) {
            return false;
        }
        if (!_setRole(_user, _role, true)) {
            return false;
        }
        _emitRoleAdded(_user, _role);
        return true;
    }

    function removeRole(address _user, bytes32 _role) returns(bool) {
        if (!_setRole(_user, _role, false)) {
            return false;
        }
        _emitRoleRemoved(_user, _role);
        return true;
    }

    function _setRole(address _user, bytes32 _role, bool _status) internal onlyContractOwner() returns(bool) {
        store.set(roles, bytes32(_user), _role, _status.toBytes32());
        return true;
    }

    function _emitRoleAdded(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitRoleAdded(_user, _role);
    }

    function _emitRoleRemoved(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitRoleRemoved(_user, _role);
    }

    event RoleAdded(address indexed user, bytes32 indexed role, uint version);
    event RoleRemoved(address indexed user, bytes32 indexed role, uint version);
    
    function emitRoleAdded(address _user, bytes32 _role) {
        RoleAdded(_user, _role, _getVersion());
    }

    function emitRoleRemoved(address _user, bytes32 _role) {
        RoleRemoved(_user, _role, _getVersion());
    }
}
