pragma solidity 0.4.8;

import './StorageInterface.sol';

contract StorageUser {
    using StorageInterface for StorageInterface.Config;
    using StorageInterface for StorageInterface.UInt;
    using StorageInterface for StorageInterface.Int;
    using StorageInterface for StorageInterface.Address;
    using StorageInterface for StorageInterface.Bool;
    using StorageInterface for StorageInterface.Bytes32;
    using StorageInterface for StorageInterface.Mapping;
    using StorageInterface for StorageInterface.Set;
    using StorageInterface for *;
    
    StorageInterface.Config store;
    
    function StorageUser(Storage _store, bytes32 _crate) {
        store.init(_store, _crate);
    }
}
