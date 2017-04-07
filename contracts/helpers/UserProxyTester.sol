pragma solidity 0.4.8;

contract UserProxyTester {
   
    function functionReturningValue(bytes32 _someInputValue) constant returns(bytes32){
        return _someInputValue;
    }

    function functionNotReturningValue(bytes32 _someInputValue) {
        return;
    }
}
