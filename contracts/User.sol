pragma solidity 0.4.8;

import "./Owned.sol";
import "./ProxyUser.sol";

contract User is ProxyUser, Owned {
    uint id;
    mapping (address => uint8) reatingsGiven;
    mapping (string => bytes32) ipfsHashes;

    function User(uint _id){
        id = _id;
    }

    function getRatingFor(address _otherUser) constant returns(uint8){
        return reatingsGiven[_otherUser];
    }

    function setRatingFor(address _otherUser, uint8 _rate) onlyContractOwner() {
        if(_rate < 0 || _rate > 10){
            return;
        }
        reatingsGiven[_otherUser] = _rate;
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

}