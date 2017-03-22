pragma solidity 0.4.8;

import '../StorageInterface.sol';

contract StorageUser {
    using StorageInterface for StorageInterface.Config;
    using StorageInterface for StorageInterface.UInt;
    using StorageInterface for StorageInterface.Int;
    using StorageInterface for StorageInterface.Address;
    using StorageInterface for StorageInterface.Bool;
    using StorageInterface for StorageInterface.Bytes32;
    using StorageInterface for StorageInterface.Mapping;
    
    StorageInterface.Config store;
    
    StorageInterface.UInt uintVar;
    StorageInterface.Int intVar;
    StorageInterface.Address addressVar;
    StorageInterface.Bool boolVar;
    StorageInterface.Bytes32 bytes32Var;
    StorageInterface.Mapping mappingVar;
    
    function StorageUser(Storage _store, bytes32 _crate) {
        store.init(_store, _crate);
        uintVar.init('uintVar');
        intVar.init('intVar');
        addressVar.init('addressVar');
        boolVar.init('boolVar');
        bytes32Var.init('bytes32Var');
        mappingVar.init('mappingVar');
    }

    function setUInt(uint _value) {
        store.set(uintVar, _value);
    }

    function getUInt() constant returns(uint) {
        return store.get(uintVar);
    }
    
    function setInt(int _value) {
        store.set(intVar, _value);
    }

    function getInt() constant returns(int) {
        return store.get(intVar);
    }

    function setAddress(address _value) {
        store.set(addressVar, _value);
    }

    function getAddress() constant returns(address) {
        return store.get(addressVar);
    }

    function setBool(bool _value) {
        store.set(boolVar, _value);
    }

    function getBool() constant returns(bool) {
        return store.get(boolVar);
    }

    function setBytes32(bytes32 _value) {
        store.set(bytes32Var, _value);
    }

    function getBytes32() constant returns(bytes32) {
        return store.get(bytes32Var);
    }

    function setMapping(bytes32 _key, bytes32 _value) {
        store.set(mappingVar, _key, _value);
    }

    function getMapping(bytes32 _key) constant returns(bytes32) {
        return store.get(mappingVar, _key);
    }
}
