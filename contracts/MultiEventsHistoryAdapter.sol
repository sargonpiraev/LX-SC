pragma solidity 0.4.8;

/**
 * @title General MultiEventsHistory user.
 *
 */
contract MultiEventsHistoryAdapter {
    address eventsHistory;

    function getEventsHistory() constant returns(address) {
        return eventsHistory;
    }

    function _setEventsHistory(address _eventsHistory) internal {
        eventsHistory = _eventsHistory;
    }

    // It is address of MultiEventsHistory caller assuming we are inside of delegate call.
    function _self() constant internal returns(address) {
        return msg.sender;
    }
}
