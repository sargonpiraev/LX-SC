pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract RatingsLibrary is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.AddressAddressUIntMapping ratingsGiven;

    event RatingGiven(address indexed rater, address indexed to, uint rating, uint version);

    function RatingsLibrary(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        ratingsGiven.init('ratingsGiven');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function getRating(address _rater, address _to) constant returns(uint) {
        return store.get(ratingsGiven, _rater, _to);
    }

    // TODO: probably need to check if the user have appropriate role.
    function setRatingFor(address _otherUser, uint _rating) returns(bool) {
        if(_rating > 10) {
            return false;
        }
        store.set(ratingsGiven, msg.sender, _otherUser, _rating);
        _emitRatingGiven(msg.sender, _otherUser, _rating);
        return true;
    }

    function _emitRatingGiven(address _rater, address _to, uint _rating) internal {
        RatingsLibrary(getEventsHistory()).emitRatingGiven(_rater, _to, _rating);
    }

    function emitRatingGiven(address _rater, address _to, uint _rating) {
        RatingGiven(_rater, _to, _rating, _getVersion());
    }
}
