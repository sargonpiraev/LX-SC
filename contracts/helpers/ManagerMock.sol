pragma solidity 0.4.8;

contract ManagerMock {
    function isAllowed(address _actor, bytes32 _role) returns(bool) {
        return true;
    }
}
