pragma solidity 0.4.8;

import "./Owned.sol";
import './EventsHistoryUser.sol';

contract UserProxy {
    function forward(address destination, bytes data, uint value);
    function forwardWithReturn(address destination, bytes data, uint value) returns(bytes32 result);
}

contract User is EventsHistoryUser, Owned {
    mapping (address => uint8) ratingsGiven;
    mapping (bytes32 => bytes32) ipfsHashes;
    UserProxy userProxy;
    event RatingGiven(address indexed to, uint8 rating, uint version);
    event HashAdded(bytes32 indexed key, bytes32 hash, uint version);

    function setUserProxy(UserProxy _userProxy){
        userProxy = _userProxy;
    }

    function getRatingFor(address _otherUser) constant returns(uint8){
        return ratingsGiven[_otherUser];
    }

    function setRatingFor(address _otherUser, uint8 _rating) onlyContractOwner() returns(bool) {
        if(_rating > 10){
            return false;
        }
        ratingsGiven[_otherUser] = _rating;
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

    function setData(address _destination, bytes _data, uint _value) onlyContractOwner()  returns(bytes32){
        userProxy.forwardWithReturn(_destination, _data, _value);
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
