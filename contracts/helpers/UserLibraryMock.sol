pragma solidity 0.4.11;

contract UserLibraryMock {
    uint addRoleCalls = 0;
    uint setManyCalls = 0; 

    function getCalls() constant returns(uint, uint){
        return (addRoleCalls, setManyCalls);
    }

    function addRole(address _user, bytes32 _role) constant returns(bool) {
        addRoleCalls++;
        return true;
    }

    function setMany(address _user, uint _areas, uint[] _categories, uint[] _skills) returns(bool) {
        setManyCalls++;
        return true;
    }
}
