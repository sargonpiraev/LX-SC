pragma solidity ^0.4.8;

import "Owned";

contract StorageManager is Owned {
    
    mapping (address => bytes32) internal approvedContracts;

    
    function isAllowed(address _actor, bytes32 _role) returns(bool){
        
    }
    
    function giveAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool){
        
    }
    
    function blockAccess(address _actor, bytes32 _role) onlyContractOwner() returns(bool){
        
    }

    
    
}
