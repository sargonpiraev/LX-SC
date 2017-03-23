pragma solidity 0.4.8;

import './Owned.sol';

contract Manager {
    function isAllowed(address _actor, bytes32 _role) constant returns(bool);
}

contract Storage is Owned {
    struct Crate {
        mapping(bytes32 => uint) uints;
        mapping(bytes32 => address) addresses;
        mapping(bytes32 => bool) bools;
        mapping(bytes32 => int) ints;
        mapping(bytes32 => bytes32) bytes32s;
    }

    mapping(bytes32 => Crate) crates;
    Manager public manager;

    modifier onlyAllowed(bytes32 _role) {
        if (manager.isAllowed(msg.sender, _role)) {
            _;
        }
    }

    function setManager(Manager _manager) onlyContractOwner() returns(bool) {
        manager = _manager;
        return true;
    }

    function setUInt(bytes32 _crate, bytes32 _key, uint _value) onlyAllowed(_crate) returns(bool) {
        crates[_crate].uints[_key] = _value;
        return true;
    }

    function getUInt(bytes32 _crate, bytes32 _key) constant returns(uint) {
        return crates[_crate].uints[_key];
    }

    function setAddress(bytes32 _crate, bytes32 _key, address _value) onlyAllowed(_crate) returns(bool) {
        crates[_crate].addresses[_key] = _value;
        return true;
    }

    function getAddress(bytes32 _crate, bytes32 _key) constant returns(address) {
        return crates[_crate].addresses[_key];
    }

    function setBool(bytes32 _crate, bytes32 _key, bool _value) onlyAllowed(_crate) returns(bool) {
        crates[_crate].bools[_key] = _value;
        return true;
    }

    function getBool(bytes32 _crate, bytes32 _key) constant returns(bool) {
        return crates[_crate].bools[_key];
    }

    function setInt(bytes32 _crate, bytes32 _key, int _value) onlyAllowed(_crate) returns(bool) {
        crates[_crate].ints[_key] = _value;
        return true;
    }

    function getInt(bytes32 _crate, bytes32 _key) constant returns(int) {
        return crates[_crate].ints[_key];
    }

    function setBytes32(bytes32 _crate, bytes32 _key, bytes32 _value) onlyAllowed(_crate) returns(bool) {
        crates[_crate].bytes32s[_key] = _value;
        return true;
    }

    function getBytes32(bytes32 _crate, bytes32 _key) constant returns(bytes32) {
        return crates[_crate].bytes32s[_key];
    }
}
