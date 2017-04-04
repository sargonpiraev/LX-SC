pragma solidity ^0.4.8;

import './Storage.sol';

library StorageInterface {
    struct Config {
        Storage store;
        bytes32 crate;
    }

    struct UInt {
        bytes32 id;
    }

    struct Int {
        bytes32 id;
    }

    struct Address {
        bytes32 id;
    }

    struct Bool {
        bytes32 id;
    }

    struct Bytes32 {
        bytes32 id;
    }

    struct Mapping {
        bytes32 id;
    }

    struct Set {
        UInt count;
        Mapping indexes;
        Mapping values;
    }

    struct AddressesSet {
        Set innerSet;
    }

    // Can't use modifier due to a Solidity bug.
    function sanityCheck(bytes32 _currentId, bytes32 _newId) internal {
        if (_currentId != 0 || _newId == 0) {
            throw;
        }
    }

    function init(Config storage self, Storage _store, bytes32 _crate) internal {
        self.store = _store;
        self.crate = _crate;
    }

    function init(UInt storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Int storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Address storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Bool storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Bytes32 storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Mapping storage self, bytes32 _id) internal {
        sanityCheck(self.id, _id);
        self.id = _id;
    }

    function init(Set storage self, bytes32 _id) internal {
        init(self.count, sha3(_id, 'count'));
        init(self.indexes, sha3(_id, 'indexes'));
        init(self.values, sha3(_id, 'values'));
    }

    function init(AddressesSet storage self, bytes32 _id) internal {
        init(self.innerSet, _id);
    }

    function set(Config storage self, UInt storage item, uint _value) internal {
        self.store.setUInt(self.crate, item.id, _value);
    }

    function set(Config storage self, Int storage item, int _value) internal {
        self.store.setInt(self.crate, item.id, _value);
    }

    function set(Config storage self, Address storage item, address _value) internal {
        self.store.setAddress(self.crate, item.id, _value);
    }

    function set(Config storage self, Bool storage item, bool _value) internal {
        self.store.setBool(self.crate, item.id, _value);
    }

    function set(Config storage self, Bytes32 storage item, bytes32 _value) internal {
        self.store.setBytes32(self.crate, item.id, _value);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, bytes32 _value) internal {
        self.store.setBytes32(self.crate, sha3(item.id, _key), _value);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _value) internal {
        self.store.setBytes32(self.crate, sha3(item.id, _key, _key2), _value);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _key3, bytes32 _value) internal {
        self.store.setBytes32(self.crate, sha3(item.id, _key, _key2, _key3), _value);
    }

    function add(Config storage self, Set storage item, bytes32 _value) internal {
        if (includes(self, item, _value)) {
            return;
        }
        uint newCount = count(self, item) + 1;
        set(self, item.values, bytes32(newCount), _value);
        set(self, item.indexes, _value, bytes32(newCount));
        set(self, item.count, newCount);
    }

    function add(Config storage self, AddressesSet storage item, address _value) internal {
        add(self, item.innerSet, bytes32(_value));
    }

    function remove(Config storage self, Set storage item, bytes32 _value) internal {
        if (!includes(self, item, _value)) {
            return;
        }
        uint lastIndex = count(self, item);
        bytes32 lastValue = get(self, item.values, bytes32(lastIndex));
        uint index = uint(get(self, item.indexes, _value));
        if (index < lastIndex) {
            set(self, item.indexes, lastValue, bytes32(index));
            set(self, item.values, bytes32(index), lastValue);
        }
        set(self, item.indexes, _value, bytes32(0));
        set(self, item.values, bytes32(lastIndex), bytes32(0));
        set(self, item.count, lastIndex - 1);
    }

    function remove(Config storage self, AddressesSet storage item, address _value) internal {
        remove(self, item.innerSet, bytes32(_value));
    }

    function get(Config storage self, UInt storage item) internal constant returns(uint) {
        return self.store.getUInt(self.crate, item.id);
    }

    function get(Config storage self, Int storage item) internal constant returns(int) {
        return self.store.getInt(self.crate, item.id);
    }

    function get(Config storage self, Address storage item) internal constant returns(address) {
        return self.store.getAddress(self.crate, item.id);
    }

    function get(Config storage self, Bool storage item) internal constant returns(bool) {
        return self.store.getBool(self.crate, item.id);
    }

    function get(Config storage self, Bytes32 storage item) internal constant returns(bytes32) {
        return self.store.getBytes32(self.crate, item.id);
    }

    function get(Config storage self, Mapping storage item, bytes32 _key) internal constant returns(bytes32) {
        return self.store.getBytes32(self.crate, sha3(item.id, _key));
    }

    function get(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2) internal constant returns(bytes32) {
        return self.store.getBytes32(self.crate, sha3(item.id, _key, _key2));
    }

    function get(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _key3) internal constant returns(bytes32) {
        return self.store.getBytes32(self.crate, sha3(item.id, _key, _key2, _key3));
    }

    function includes(Config storage self, Set storage item, bytes32 _value) internal constant returns(bool) {
        return get(self, item.indexes, _value) != 0;
    }

    function includes(Config storage self, AddressesSet storage item, address _value) internal constant returns(bool) {
        return includes(self, item.innerSet, bytes32(_value));
    }

    function count(Config storage self, Set storage item) internal constant returns(uint) {
        return get(self, item.count);
    }

    function count(Config storage self, AddressesSet storage item) internal constant returns(uint) {
        return count(self, item.innerSet);
    }

    function get(Config storage self, Set storage item) internal constant returns(bytes32[]) {
        uint valuesCount = count(self, item);
        bytes32[] memory result = new bytes32[](valuesCount);
        for (uint i = 0; i < valuesCount; i++) {
            result[i] = get(self, item, i);
        }
        return result;
    }

    function get(Config storage self, AddressesSet storage item) internal constant returns(address[]) {
        return toAddresses(get(self, item.innerSet));
    }

    function get(Config storage self, Set storage item, uint _index) internal constant returns(bytes32) {
        return get(self, item.values, bytes32(_index+1));
    }

    function get(Config storage self, AddressesSet storage item, uint _index) internal constant returns(address) {
        return address(get(self, item.innerSet, _index));
    }

    function toBool(bytes32 self) constant returns(bool) {
        return self != bytes32(0);
    }

    function toBytes32(bool self) constant returns(bytes32) {
        return bytes32(self ? 1 : 0);
    }

    function toAddresses(bytes32[] memory self) constant returns(address[]) {
        address[] memory result = new address[](self.length);
        for (uint i = 0; i < self.length; i++) {
            result[i] = address(self[i]);
        }
        return result;
    }
}
