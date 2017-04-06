pragma solidity 0.4.8;

contract Listener {
    struct Request {
        address from;
        uint value;
        bytes32 data;
    }
    Request[] requests;
    mapping(bytes32 => uint) public deniesExpected;

    function () payable {
        bytes32 operation = sha3(msg.data);
        requests.push(Request(msg.sender, msg.value, operation));
        bool result = true;
        if (deniesExpected[operation] > 0) {
            result = false;
            deniesExpected[operation]--;
        }
        assembly {
            mstore(0, result)
            return(0, 32)
        }
    }

    function addDeny(bytes32 _operation) {
        deniesExpected[_operation]++;
    }

    function getFromEnd(uint _index) constant returns(address, uint, bytes32) {
        return getFromStart(requests.length - 1 - _index);
    }

    function getFromStart(uint _index) constant returns(address, uint, bytes32) {
        Request result = requests[_index];
        return (result.from, result.value, result.data);
    }

    function getCount() constant returns(uint) {
        return requests.length;
    }
}
