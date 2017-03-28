pragma solidity 0.4.8;

contract EventsHistoryInterface {
    function versions(address _address) constant returns(uint);
}

/**
 * @title General EventsHistory user.
 *
 * Contains all the original event emitting function definitions and events.
 * In case of new events needed later, additional emitters can be developed.
 * All the functions is meant to be called using delegatecall.
 */
contract EventsHistoryUser {
    address eventsHistory;

    function getEventsHistory() constant returns(address) {
        return eventsHistory;
    }

    function _setEventsHistory(address _eventsHistory) internal {
        eventsHistory = _eventsHistory;
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
