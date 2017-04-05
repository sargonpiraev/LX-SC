pragma solidity 0.4.8;

import "./Owned.sol";
import "./ProxyUser.sol";
import './EventsHistoryUser.sol';

contract User is EventsHistoryUser, ProxyUser, Owned {
    mapping (address => uint8) reatingsGiven;
    mapping (bytes32 => bytes32) ipfsHashes;
    event RatingGiven(address to, uint8 rating, uint version);
    event HashAdded(bytes32 key, bytes32 hash, uint version);

    function getRatingFor(address _otherUser) constant returns(uint8){
        return reatingsGiven[_otherUser];
    }

    function setRatingFor(address _otherUser, uint8 _rating) onlyContractOwner() returns(bool) {
        if(_rating < 0 || _rating > 10){
            return false;
        }
        reatingsGiven[_otherUser] = _rating;
        _emitRatingGiven(_otherUser, _rating);
        return true;
    }

    function getHashFor(bytes32 _itemName) constant returns(bytes32) {
        return ipfsHashes[_itemName];
    }

    function setHashFor(bytes32 _itemName, bytes32 _itemHash) onlyContractOwner() returns(bool) {
        ipfsHashes[_itemName] = _itemHash;
        _emitHashAdded(_itemName, _itemHash);
        return true;
    }

    function setData(address _destination, bytes _data, uint _value) onlyContractOwner() {
        forward(_destination, _data, _value);
    }

    function getData(address _destination, bytes _data, uint _value) onlyContractOwner() returns(bytes32) {
        return forwardWithReturn(_destination, _data, _value);
    }

    function deleteData(address _destination, bytes _data, uint _value) onlyContractOwner() {
        forward(_destination, _data, _value);
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function _emitRatingGiven(address _to, uint8 _rating) internal {
        User(getEventsHistory()).emitRatingGiven(_to, _rating);
    }

    function _emitHashAdded(bytes32 _key, bytes32 _hash) internal {
        User(getEventsHistory()).emitHashAdded(_key, _hash);
    }
    
    function emitRatingGiven(address _to, uint8 _rating) {
        RatingGiven(_to, _rating, _getVersion());
    }

    function emitHashAdded(bytes32 _key, bytes32 _hash) {
        HashAdded(_key, _hash, _getVersion());
    }

}