pragma solidity 0.4.8;

import './Owned.sol';
import './StorageAdapter.sol';
import './MultiEventsHistoryAdapter.sol';

contract Roles2Library is StorageAdapter, MultiEventsHistoryAdapter, Owned {
    StorageInterface.AddressBoolMapping rootUsers;
    StorageInterface.AddressBytes32Mapping userRoles;
    StorageInterface.AddressBytes4Bytes32Mapping capabilityRoles;
    StorageInterface.AddressBytes4BoolMapping publicCapabilities;

    event RoleAdded(address indexed self, address indexed user, uint8 indexed role);
    event RoleRemoved(address indexed self, address indexed user, uint8 indexed role);
    event CapabilityAdded(address indexed self, address indexed code, bytes4 sig, uint8 indexed role);
    event CapabilityRemoved(address indexed self, address indexed code, bytes4 sig, uint8 indexed role);
    event PublicCapabilityAdded(address indexed self, address indexed code, bytes4 sig);
    event PublicCapabilityRemoved(address indexed self, address indexed code, bytes4 sig);

    function Roles2Library(Storage _store, bytes32 _crate) StorageAdapter(_store, _crate) {
        rootUsers.init('rootUsers');
        userRoles.init('userRoles');
        capabilityRoles.init('capabilityRoles');
        publicCapabilities.init('publicCapabilities');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function getUserRoles(address _who) constant returns(bytes32) {
        return store.get(userRoles, _who);
    }

    function getCapabilityRoles(address _code, bytes4 _sig) constant returns(bytes32) {
        return store.get(capabilityRoles, _code, _sig);
    }

    function canCall(address _caller, address _code, bytes4 _sig) constant returns(bool) {
        if (isUserRoot(_caller) || isCapabilityPublic(_code, _sig)) {
            return true;
        }
        return bytes32(0) != getUserRoles(_caller) & getCapabilityRoles(_code, _sig);
    }

    function bitNot(bytes32 _input) constant returns(bytes32) {
        return (_input ^ bytes32(uint(-1)));
    }

    function setRootUser(address _who, bool _enabled) onlyContractOwner() returns(bool) {
        store.set(rootUsers, _who, _enabled);
        return true;
    }

    function setUserRole(address _who, uint8 _role, bool _enabled) onlyContractOwner() returns(bool) {
        bytes32 lastRoles = getUserRoles(_who);
        bytes32 shifted = _shift(_role);
        if (_enabled) {
            store.set(userRoles, _who, lastRoles | shifted);
            _emitRoleAdded(_who, _role);
        } else {
            store.set(userRoles, _who, lastRoles & bitNot(shifted));
            _emitRoleRemoved(_who, _role);
        }
        return true;
    }

    function setPublicCapability(address _code, bytes4 _sig, bool _enabled) onlyContractOwner() returns(bool) {
        store.set(publicCapabilities, _code, _sig, _enabled);
        if (_enabled) {
            _emitPublicCapabilityAdded(_code, _sig);
        } else {
            _emitPublicCapabilityRemoved(_code, _sig);
        }
        return true;
    }

    function setRoleCapability(uint8 _role, address _code, bytes4 _sig, bool _enabled) onlyContractOwner() returns(bool) {
        bytes32 lastRoles = getCapabilityRoles(_code, _sig);
        bytes32 shifted = _shift(_role);
        if (_enabled) {
            store.set(capabilityRoles, _code, _sig, lastRoles | shifted);
            _emitCapabilityAdded(_code, _sig, _role);
        } else {
            store.set(capabilityRoles, _code, _sig, lastRoles & bitNot(shifted));
            _emitCapabilityRemoved(_code, _sig, _role);
        }
        return true;
    }

    function isUserRoot(address _who) constant returns(bool) {
        return store.get(rootUsers, _who);
    }

    function isCapabilityPublic(address _code, bytes4 _sig) constant returns(bool) {
        return store.get(publicCapabilities, _code, _sig);
    }

    function hasUserRole(address _who, uint8 _role) constant returns (bool) {
        return bytes32(0) != getUserRoles(_who) & _shift(_role);
    }

    function _shift(uint8 _role) constant internal returns(bytes32) {
        return bytes32(uint(uint(2) ** uint(_role)));
    }

    function _emitRoleAdded(address _who, uint8 _role) internal {
        Roles2Library(getEventsHistory()).emitRoleAdded(_who, _role);
    }

    function _emitRoleRemoved(address _who, uint8 _role) internal {
        Roles2Library(getEventsHistory()).emitRoleRemoved(_who, _role);
    }

    function _emitCapabilityAdded(address _code, bytes4 _sig, uint8 _role) internal {
        Roles2Library(getEventsHistory()).emitCapabilityAdded(_code, _sig, _role);
    }

    function _emitCapabilityRemoved(address _code, bytes4 _sig, uint8 _role) internal {
        Roles2Library(getEventsHistory()).emitCapabilityRemoved(_code, _sig, _role);
    }

    function _emitPublicCapabilityAdded(address _code, bytes4 _sig) internal {
        Roles2Library(getEventsHistory()).emitPublicCapabilityAdded(_code, _sig);
    }

    function _emitPublicCapabilityRemoved(address _code, bytes4 _sig) internal {
        Roles2Library(getEventsHistory()).emitPublicCapabilityRemoved(_code, _sig);
    }

    function emitRoleAdded(address _who, uint8 _role) {
        RoleAdded(_self(), _who, _role);
    }

    function emitRoleRemoved(address _who, uint8 _role) {
        RoleRemoved(_self(), _who, _role);
    }

    function emitCapabilityAdded(address _code, bytes4 _sig, uint8 _role) {
        CapabilityAdded(_self(), _code, _sig, _role);
    }

    function emitCapabilityRemoved(address _code, bytes4 _sig, uint8 _role) {
        CapabilityRemoved(_self(), _code, _sig, _role);
    }

    function emitPublicCapabilityAdded(address _code, bytes4 _sig) {
        PublicCapabilityAdded(_self(), _code, _sig);
    }

    function emitPublicCapabilityRemoved(address _code, bytes4 _sig) {
        PublicCapabilityRemoved(_self(), _code, _sig);
    }
}
