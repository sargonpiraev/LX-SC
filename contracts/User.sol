pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract UserProxy {
    function forward(address destination, bytes data, uint value, bool throwOnFailedCall) returns(bytes32 result);
}

contract User is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.AddressUIntMapping ratingsGiven;
    StorageInterface.Mapping ipfsHashes;
    UserProxy userProxy;
    event RatingGiven(address indexed to, uint rating, uint version);
    event HashAdded(bytes32 indexed key, bytes32 hash, uint version);

    function User(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        ipfsHashes.init('ipfsHashes');
        ratingsGiven.init('ratingsGiven');
    }

    function setUserProxy(UserProxy _userProxy) onlyContractOwner() returns(bool) {
        userProxy = _userProxy;
        return true;
    }

    function getUserProxy() constant returns(address) {
        return userProxy;
    }

    function getRatingFor(address _otherUser) constant returns(uint) {
        return store.get(ratingsGiven, _otherUser);
    }

    function setRatingFor(address _otherUser, uint _rating) onlyContractOwner() returns(bool) {
        if(_rating > 10){
            return false;
        }
        store.set(ratingsGiven, _otherUser, _rating);
        _emitRatingGiven(_otherUser, _rating);
        return true;
    }

    function getHashFor(bytes32 _itemName) constant returns(bytes32) {
        return store.get(ipfsHashes, _itemName);
    }

    function setHashFor(bytes32 _itemName, bytes32 _itemHash) onlyContractOwner() returns(bool) {
        store.set(ipfsHashes, _itemName, _itemHash);
        _emitHashAdded(_itemName, _itemHash);
        return true;
    }

    function forward(address _destination, bytes _data, uint _value, bool _throwOnFailedCall) onlyContractOwner() returns(bytes32) {
        return userProxy.forward(_destination, _data, _value, _throwOnFailedCall);
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function _emitRatingGiven(address _to, uint _rating) internal {
        User(getEventsHistory()).emitRatingGiven(_to, _rating);
    }

    function _emitHashAdded(bytes32 _key, bytes32 _hash) internal {
        User(getEventsHistory()).emitHashAdded(_key, _hash);
    }
    
    function emitRatingGiven(address _to, uint _rating) {
        RatingGiven(_to, _rating, _getVersion());
    }

    function emitHashAdded(bytes32 _key, bytes32 _hash) {
        HashAdded(_key, _hash, _getVersion());
    }
}
