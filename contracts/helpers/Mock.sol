pragma solidity 0.4.8;

contract Mock {
    event UnexpectedCall(uint index, address from, uint value, bytes input, bytes32 callHash);
    
    struct Expect {
        bytes32 callHash;
        bytes32 callReturn;
    }

    uint public expectationsCount;
    uint public nextExpectation;
    uint public callsCount;
    mapping(uint => Expect) public expectations;

    function () payable {
        callsCount++;
        bytes32 callHash = sha3(msg.sender, msg.value, msg.data);
        if (expectations[nextExpectation].callHash != callHash) {
            UnexpectedCall(nextExpectation, msg.sender, msg.value, msg.data, callHash);
            return;
        }
        bytes32 result = expectations[nextExpectation++].callReturn;
        assembly {
            mstore(0, result)
            return(0, 32)
        }
    }

    function expect(address _from, uint _value, bytes _input, bytes32 _return) {
        if (nextExpectation == 0) {
            nextExpectation = 1;
        }
        expectations[++expectationsCount] = Expect(sha3(_from, _value, _input), _return);
    }

    function assertExpectations() constant {
        if (expectationsLeft() != 0 || callsCount != expectationsCount) {
            throw;
        }
    }

    function expectationsLeft() constant returns(uint) {
        return (expectationsCount + 1) - nextExpectation;
    }
}
