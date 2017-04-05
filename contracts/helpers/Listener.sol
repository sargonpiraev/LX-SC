pragma solidity 0.4.8;

contract Listener {
    struct Request {
        address from;
        uint value;
        bytes data;
    }
    Request[] requests;

    function () payable {
        requests.push(Request(msg.sender, msg.value, msg.data));
    }

    function getFromEnd(uint _index) constant returns(address, uint, bytes) {
        return getFromStart(requests.length - 1 - _index);
    }

    function getFromStart(uint _index) constant returns(address, uint, bytes) {
        Request result = requests[_index];
        return (result.from, result.value, result.data);
    }
}
