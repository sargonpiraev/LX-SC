pragma solidity 0.4.8;

import './Owned.sol';

contract UserProxyInterface {
    function forward(address destination, bytes data, uint value, bool throwOnFailedCall) returns(bytes32 result);
}

contract User is Owned {
    UserProxyInterface userProxy;

    function setUserProxy(UserProxyInterface _userProxy) onlyContractOwner() returns(bool) {
        userProxy = _userProxy;
        return true;
    }

    function getUserProxy() constant returns(address) {
        return userProxy;
    }

    function forward(address _destination, bytes _data, uint _value, bool _throwOnFailedCall) onlyContractOwner() returns(bytes32) {
        return userProxy.forward(_destination, _data, _value, _throwOnFailedCall);
    }

    // Recovery functions should be added here.
}
