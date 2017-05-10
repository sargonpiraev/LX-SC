pragma solidity 0.4.8;

import './Owned.sol';
import './UserProxy.sol';

contract User is Owned {
    UserProxy userProxy;

    function setUserProxy(UserProxy _userProxy) onlyContractOwner() returns(bool) {
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
