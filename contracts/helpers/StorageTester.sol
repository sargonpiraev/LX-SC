pragma solidity 0.4.8;

import '../StorageInterface.sol';
import '../StorageUser.sol';

contract StorageTester is StorageUser {
    StorageInterface.UInt uintVar;
    StorageInterface.Int intVar;
    StorageInterface.Address addressVar;
    StorageInterface.Bool boolVar;
    StorageInterface.Bytes32 bytes32Var;
    StorageInterface.Mapping mappingVar;
    StorageInterface.Set setVar;
    
    function StorageTester(Storage _store, bytes32 _crate) StorageUser(_store, _crate) {
        uintVar.init('uintVar');
        intVar.init('intVar');
        addressVar.init('addressVar');
        boolVar.init('boolVar');
        bytes32Var.init('bytes32Var');
        mappingVar.init('mappingVar');
        setVar.init('setVar');
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

    function addSet(bytes32 _value) {
        store.add(setVar, _value);
    }

    function removeSet(bytes32 _value) {
        store.remove(setVar, _value);
    }

    function includeSet(bytes32 _value) constant returns(bool) {
        return store.include(setVar, _value);
    }

    function countSet() constant returns(uint) {
        return store.count(setVar);
    }

    function getSet() constant returns(bytes32[]) {
        return store.get(setVar);
    }
}
