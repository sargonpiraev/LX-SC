pragma solidity ^0.4.4;

import "./Owned.sol";

contract UserProxy is Owned{
    event Forwarded (
        address indexed destination,
        uint value,
        bytes data
    );
    event Received (
        address indexed sender,
        uint value
    );

    function () payable {
        Received(msg.sender, msg.value);
    }
    
    function forward(address destination, bytes data, uint value) {
    	// If a contract tries to CALL or CREATE a contract with either
    	// (i) insufficient balance, or (ii) stack depth already at maximum (1024),
    	// the sub-execution and transfer do not occur at all, no gas gets consumed, and 0 is added to the stack.
    	// see: https://github.com/ethereum/wiki/wiki/Subtleties#exceptional-conditions
        if (!destination.call.value(value)(data)) {
            throw;
        }
        Forwarded(destination, value, data);
    }

    function forwardWithReturn(address destination, bytes data, uint value) returns(bytes32 result) {
        bool success;
        assembly {
            success := call(div(mul(gas, 63), 64), destination, value, add(data, 32), mload(data), 0, 32)
            result := mload(0)
        }
        Forwarded(destination, value, data);
    }
}
