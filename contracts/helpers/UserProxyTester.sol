pragma solidity 0.4.8;

contract UserProxyTester {
    function functionReturningValue(bytes32 _someInputValue) returns(bytes32) {
        return _someInputValue;
    }

    function unsuccessfullFunction(bytes32 _someInputValue) returns(bytes32) {
        throw;
    }

    function forward(address _destination, bytes _data, uint _value, bool _throwOnFailedCall) returns(bytes32) {
        return 0x3432000000000000000000000000000000000000000000000000000000000000;
    }
}
