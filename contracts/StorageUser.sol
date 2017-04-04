pragma solidity 0.4.8;

import './StorageInterface.sol';

contract StorageUser {
    using StorageInterface for *;

    StorageInterface.Config store;

    function StorageUser(Storage _store, bytes32 _crate) {
        store.init(_store, _crate);
    }
}
