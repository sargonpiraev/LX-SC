pragma solidity 0.4.8;

contract User {
    uint public userId;
    mapping (address => uint8) public reatingsGiven;
    mapping (string => bytes32) ipfsHashes;

    function setData(address _destination, bytes _data, uint _value) {
        _forward(_destination, _data, _value);
    }

    function getData(address _destination, bytes _data, uint _value) returns(bytes32) {
        return _forwardWithReturn(_destination, _data, _value);
    }

    function deleteData(address _destination, bytes _data, uint _value) {
        _forward(_destination, _data, _value);
    }

    function _forwardWithReturn(address _destination, bytes _data, uint _value) internal returns(bytes32 result) {
        bool success;
        assembly {
            success := call(div(mul(gas, 63), 64), _destination, _value, add(_data, 32), mload(_data), 0, 32)
            result := mload(0)
        }
    }

    function _forward(address _destination, bytes _data, uint _value) internal{
        if (!_destination.call.value(_value)(_data)) {
            throw;
        }
    }

}