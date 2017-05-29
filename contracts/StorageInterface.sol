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

    struct Int8 {
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

    struct AddressUIntMapping {
        Mapping innerMapping;
    }

    struct AddressUIntUIntMapping {
        Mapping innerMapping;
    }

    struct AddressUIntUIntUIntMapping {
        Mapping innerMapping;
    }

    struct AddressUIntStructAddressInt8Mapping {
        Mapping innerMapping;
    }

    struct AddressUIntUIntStructAddressInt8Mapping {
        Mapping innerMapping;
    }

    struct AddressUIntUIntUIntStructAddressInt8Mapping {
        Mapping innerMapping;
    }
    
    struct AddressUIntUIntUIntUIntStructAddressInt8Mapping {
        Mapping innerMapping;
    }

    struct AddressUIntAddressInt8Mapping {
        Mapping innerMapping;
    }

    struct AddressUIntUIntAddressInt8Mapping {
        Mapping innerMapping;
    }
    
    struct AddressUIntUIntUIntAddressInt8Mapping {
        Mapping innerMapping;
    }

    struct AddressAddressUIntMapping {
        Mapping innerMapping;
    }

    struct AddressBytes32Bytes32Mapping {
        Mapping innerMapping;
    }

    struct UIntBytes32Mapping {
        Mapping innerMapping;
    }

    struct UIntUIntBytes32Mapping {
        Mapping innerMapping;
    }

    struct UIntUIntUIntBytes32Mapping {
        Mapping innerMapping;
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

    function init(AddressUIntMapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntMapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntUIntMapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntStructAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntStructAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntUIntStructAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntUIntUIntStructAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressUIntUIntUIntAddressInt8Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressAddressUIntMapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(AddressBytes32Bytes32Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(UIntBytes32Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(UIntUIntBytes32Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
    }

    function init(UIntUIntUIntBytes32Mapping storage self, bytes32 _id) internal {
        init(self.innerMapping, _id);
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

    function set(Config storage self, Mapping storage item, bytes32 _key, int8 _value) internal {
        self.store.setInt8(self.crate, sha3(item.id, _key), _value);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, address _value, int8 _value2) internal {
        self.store.setAddressInt8(self.crate, sha3(item.id, _key), _value, _value2);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _value) internal {
        set(self, item, sha3(_key, _key2), _value);
    }

    function set(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _key3, bytes32 _value) internal {
        set(self, item, sha3(_key, _key2, _key3), _value);
    }

    function set(Config storage self, AddressUIntMapping storage item, address _key, uint _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_value));
    }

    function set(Config storage self, AddressUIntUIntMapping storage item, address _key, uint _key2, uint _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_value));
    }

    function set(Config storage self, AddressUIntUIntUIntMapping storage item, address _key, uint _key2,  uint _key3, uint _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_value));
    }

    function set(Config storage self, AddressUIntStructAddressInt8Mapping storage item, address _key, uint _key2, address _value, int8 _value2) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2)), _value, _value2);
    }

    function set(Config storage self, AddressUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, address _value, int8 _value2) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3)), _value, _value2);
    }

    function set(Config storage self, AddressUIntUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2,  uint _key3, uint _key4, address _value, int8 _value2) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4)), _value, _value2);
    }

    function set(Config storage self, AddressUIntAddressInt8Mapping storage item, address _key, uint _key2, address _key3, int8 _value) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3)), _value);
    }

    function set(Config storage self, AddressUIntUIntAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, address _key4, int8 _value) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4)), _value);
    }

    function set(Config storage self, AddressUIntUIntUIntAddressInt8Mapping storage item, address _key, uint _key2,  uint _key3, uint _key4, address _key5, int8 _value) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4), bytes32(_key5)), _value);
    }

    function set(Config storage self, AddressUIntUIntUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2,  uint _key3, uint _key4, uint _key5, address _value, int8 _value2) internal {
        set(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4), bytes32(_key5)), _value, _value2);
    }

    function set(Config storage self, AddressAddressUIntMapping storage item, address _key, address _key2, uint _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_value));
    }

    function set(Config storage self, AddressBytes32Bytes32Mapping storage item, address _key, bytes32 _key2, bytes32 _value) internal {
        set(self, item.innerMapping, bytes32(_key), _key2, _value);
    }

    function set(Config storage self, UIntBytes32Mapping storage item, uint _key, bytes32 _value) internal {
        set(self, item.innerMapping, bytes32(_key), _value);
    }

    function set(Config storage self, UIntUIntBytes32Mapping storage item, uint _key, uint _key2, bytes32 _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_key2), _value);
    }

    function set(Config storage self, UIntUIntUIntBytes32Mapping storage item, uint _key, uint _key2,  uint _key3, bytes32 _value) internal {
        set(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_key3), _value);
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

    function getAddressInt8(Config storage self, Mapping storage item, bytes32 _key) internal constant returns(address, int8) {
        return self.store.getAddressInt8(self.crate, sha3(item.id, _key));
    }

    function getInt8(Config storage self, Mapping storage item, bytes32 _key) internal constant returns(int8) {
        return self.store.getInt8(self.crate, sha3(item.id, _key));
    }

    function get(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2) internal constant returns(bytes32) {
        return get(self, item, sha3(_key, _key2));
    }

    function get(Config storage self, Mapping storage item, bytes32 _key, bytes32 _key2, bytes32 _key3) internal constant returns(bytes32) {
        return get(self, item, sha3(_key, _key2, _key3));
    }

    function get(Config storage self, AddressUIntMapping storage item, address _key) internal constant returns(uint) {
        return uint(get(self, item.innerMapping, bytes32(_key)));
    }

    function get(Config storage self, AddressUIntUIntMapping storage item, address _key, uint _key2) internal constant returns(uint) {
        return uint(get(self, item.innerMapping, bytes32(_key), bytes32(_key2)));
    }

    function get(Config storage self, AddressUIntUIntUIntMapping storage item, address _key, uint _key2, uint _key3) internal constant returns(uint) {
        return uint(get(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_key3)));
    }

    function get(Config storage self, AddressUIntStructAddressInt8Mapping storage item, address _key, uint _key2) internal constant returns(address, int8) {
        return getAddressInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2)));
    }

    function get(Config storage self, AddressUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2, uint _key3) internal constant returns(address, int8) {
        return getAddressInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3)));
    }

    function get(Config storage self, AddressUIntUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, uint _key4) internal constant returns(address, int8) {
        return getAddressInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4)));
    }

    function get(Config storage self, AddressUIntAddressInt8Mapping storage item, address _key, uint _key2, address _key3) internal constant returns(int8) {
        return getInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3)));
    }

    function get(Config storage self, AddressUIntUIntAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, address _key4) internal constant returns(int8) {
        return getInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4)));
    }

    function get(Config storage self, AddressUIntUIntUIntAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, uint _key4, address _key5) internal constant returns(int8) {
        return getInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4), bytes32(_key5)));
    }

    function get(Config storage self, AddressUIntUIntUIntUIntStructAddressInt8Mapping storage item, address _key, uint _key2, uint _key3, uint _key4, uint _key5) internal constant returns(address, int8) {
        return getAddressInt8(self, item.innerMapping, sha3(bytes32(_key), bytes32(_key2), bytes32(_key3), bytes32(_key4), bytes32(_key5)));
    }

    function get(Config storage self, AddressAddressUIntMapping storage item, address _key, address _key2) internal constant returns(uint) {
        return uint(get(self, item.innerMapping, bytes32(_key), bytes32(_key2)));
    }

    function get(Config storage self, AddressBytes32Bytes32Mapping storage item, address _key, bytes32 _key2) internal constant returns(bytes32) {
        return get(self, item.innerMapping, bytes32(_key), _key2);
    }

    function get(Config storage self, UIntBytes32Mapping storage item, uint _key) internal constant returns(bytes32) {
        return get(self, item.innerMapping, bytes32(_key));
    }

    function get(Config storage self, UIntUIntBytes32Mapping storage item, uint _key, uint _key2) internal constant returns(bytes32) {
        return get(self, item.innerMapping, bytes32(_key), bytes32(_key2));
    }

    function get(Config storage self, UIntUIntUIntBytes32Mapping storage item, uint _key, uint _key2, uint _key3) internal constant returns(bytes32) {
        return get(self, item.innerMapping, bytes32(_key), bytes32(_key2), bytes32(_key3));
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
