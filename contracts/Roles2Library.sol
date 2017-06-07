pragma solidity 0.4.8;

import './Owned.sol';
import './StorageAdapter.sol';
import './MultiEventsHistoryAdapter.sol';

contract Roles2Library is StorageAdapter, MultiEventsHistoryAdapter, Owned {
    StorageInterface.AddressBoolMapping rootUsers;
    StorageInterface.AddressBytes32Mapping userRoles;
    StorageInterface.AddressBytes4Bytes32Mapping capabilityRoles;
    StorageInterface.AddressBytes4BoolMapping publicCapabilities;

    function Roles2Library(Storage _store, bytes32 _crate) StorageAdapter(_store, _crate) {
        rootUsers.init('rootUsers');
        userRoles.init('userRoles');
        capabilityRoles.init('capabilityRoles');
        publicCapabilities.init('publicCapabilities');
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
        } else {
            store.set(userRoles, _who, lastRoles & bitNot(shifted));
        }
        return true;
    }

    function setPublicCapability(address _code, bytes4 _sig, bool _enabled) onlyContractOwner() returns(bool) {
        store.set(publicCapabilities, _code, _sig, _enabled);
        return true;
    }

    function setRoleCapability(uint8 _role, address _code, bytes4 _sig, bool _enabled) onlyContractOwner() returns(bool) {
        bytes32 lastRoles = getCapabilityRoles(_code, _sig);
        bytes32 shifted = _shift(_role);
        if (_enabled) {
            store.set(capabilityRoles, _code, _sig, lastRoles | shifted);
        } else {
            store.set(capabilityRoles, _code, _sig, lastRoles & bitNot(shifted));
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
        return bytes32(uint256(uint256(2) ** uint256(_role)));
    }
}
