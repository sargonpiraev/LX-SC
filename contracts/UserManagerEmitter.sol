pragma solidity 0.4.8;

contract EventsHistoryInterface {
    function versions(address _address) constant returns(uint);
}

/**
 * @title UserManager Emitter.
 *
 * Contains all the original event emitting function definitions and events.
 * In case of new events needed later, additional emitters can be developed.
 * All the functions is meant to be called using delegatecall.
 */
library UserManagerEmitter {
    event AddRole(address indexed user, bytes32 indexed role, uint version);
    event RemoveRole(address indexed user, bytes32 indexed role, uint version);
    
    function emitAddRole(address _user, bytes32 _role) {
        AddRole(_user, _role, _getVersion());
    }

    function emitRemoveRole(address _user, bytes32 _role) {
        RemoveRole(_user, _role, _getVersion());
    }

    /**
     * Get version number of the caller.
     *
     * Assuming that the call is made by EventsHistory using delegate call,
     * context was not changed, so the caller is the address that called
     * EventsHistory.
     *
     * @return current context caller version number.
     */
    function _getVersion() constant internal returns(uint) {
        return EventsHistoryInterface(address(this)).versions(msg.sender);
    }
}
