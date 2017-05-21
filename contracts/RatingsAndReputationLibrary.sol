pragma solidity 0.4.8;

import './Owned.sol';
import './UserLibrary.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract RatingsAndReputationLibrary is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.AddressAddressUIntMapping userRatingsGiven;
    StorageInterface.AddressUIntRateMapping ratingsGiven;
    StorageInterface.AddressUIntUIntRateMapping areaRatingsGiven;
    StorageInterface.AddressUIntUIntUIntRateMapping categoryRatingsGiven;
    StorageInterface.AddressUIntUIntUIntUIntRateMapping skillRatingsGiven;
    UserLibrary userLibrary;

    // struct Rate {
    //     address ratedBy;
    //     uint rate;
    // }

    event UserRatingGiven(address indexed rater, address indexed to, uint rating, uint version);
    event RatingGiven(address indexed rater, address indexed to, uint rating, uint jobId, uint version);
    event AreaRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint jobId, uint version);
    event CategoryRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint _category, uint jobId, uint version);
    event SkillRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint _category, uint _skill, uint jobId, uint version);

    modifier hasEvaluatorRole(address user) {
        //Here should be roles check
        // UserLibrary.hasRole(user, evaluatorRole);
        _;
    }

    modifier hasClientOrWorkerRole(address user) {
        //Here should be roles check
        // UserLibrary.hasRole(user, roles);
        _;
    }

    modifier hasClientRole(address user) {
        //Here should be roles check
        // UserLibrary.hasRole(user, clientRole);
        _;
    }

    modifier isValidRating(uint _rating){
        if(_rating <= 10) {
            _;
        }
    }

    function RatingsAndReputationLibrary(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        ratingsGiven.init('ratingsGiven');
        userRatingsGiven.init('userRatingsGiven');
        areaRatingsGiven.init('areaRatingsGiven');
        categoryRatingsGiven.init('categoryRatingsGiven');
        skillRatingsGiven.init('skillRatingsGiven');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setupUserLibrary(address _userLibrary) onlyContractOwner() returns(bool){
        userLibrary = UserLibrary(_userLibrary);
        return true;
    }

    function getUserRating(address _rater, address _to) constant returns(uint) {
        return store.get(userRatingsGiven, _rater, _to);
    }

    function setUserRating(address _otherUser, uint _rating) isValidRating(_rating) returns(bool) {
        store.set(userRatingsGiven, msg.sender, _otherUser, _rating);
        _emitUserRatingGiven(msg.sender, _otherUser, _rating);
        return true;
    }

    function getRating(address _to, uint _jobId) constant returns(address, uint) {
        return store.get(ratingsGiven, _to, _jobId);
    }

    function setRating(address _to, uint _rating,  uint _jobId) isValidRating(_rating) hasClientOrWorkerRole(msg.sender) returns(bool) {
        store.set(ratingsGiven, _to, _jobId, msg.sender, _rating);
        _emitRatingGiven(msg.sender, _to, _jobId, _rating);
        return true;
    }

    function getAreaRating(address _to, uint _jobId, uint _area) constant returns(address, uint) {
        return store.get(areaRatingsGiven, _to, _jobId, _area);
    }

    function setAreaRating(address _to, uint _area, uint _rating,  uint _jobId) 
        isValidRating(_rating) 
        hasClientOrWorkerRole(msg.sender) 
    //isSingleFlag
    returns(bool) {
        store.set(areaRatingsGiven, _to, _jobId, _area, msg.sender, _rating);
        _emitAreaRatingGiven(msg.sender, _to, _jobId, _area, _rating);
        return true;
    }

    function getCategoryRating(address _to, uint _jobId, uint _area, uint _category) constant returns(address, uint) {
        return store.get(categoryRatingsGiven, _to, _jobId, _area, _category);
    }

    function setCategoryRating(address _to, uint _area, uint _rating,  uint _jobId, uint _category) 
        isValidRating(_rating) 
        hasClientOrWorkerRole(msg.sender) 
    //isSingleFlag
    returns(bool) {
        store.set(categoryRatingsGiven, _to, _jobId, _area, _category, msg.sender, _rating);
        _emitCategoryRatingGiven(msg.sender, _to, _jobId, _area, _category, _rating);
        return true;
    }

    function getSkillRating(address _to, uint _jobId, uint _area, uint _category, uint _skill) constant returns(address, uint) {
        return store.get(skillRatingsGiven, _to, _jobId, _area, _category, _skill);
    }

    function setSkillRating(address _to, uint _area, uint _rating,  uint _jobId, uint _category, uint _skill) 
        isValidRating(_rating) 
        hasClientOrWorkerRole(msg.sender) 
    //isSingleFlag
    returns(bool) {
        store.set(skillRatingsGiven, _to, _jobId, _area, _category, _skill, msg.sender, _rating);
        _emitSkillRatingGiven(msg.sender, _to, _jobId, _area, _category, _skill, _rating);
        return true;
    }

    function _emitRatingGiven(address _rater, address _to, uint _jobId, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitRatingGiven(_rater, _to, _jobId, _rating);
    }

    function _emitUserRatingGiven(address _rater, address _to, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitUserRatingGiven(_rater, _to, _rating);
    }

    function _emitAreaRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitAreaRatingGiven(_rater, _to, _jobId, _area, _rating);
    }

    function _emitCategoryRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _category, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitCategoryRatingGiven(_rater, _to, _jobId, _area, _category, _rating);
    }

    function _emitSkillRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _category, uint _skill, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitSkillRatingGiven(_rater, _to, _jobId, _area, _category, _skill, _rating);
    }

    function emitRatingGiven(address _rater, address _to, uint _jobId, uint _rating) {
        RatingGiven(_rater, _to, _rating, _jobId, _getVersion());
    }
    
    function emitUserRatingGiven(address _rater, address _to, uint _rating) {
        UserRatingGiven(_rater, _to, _rating, _getVersion());
    }
    
    function emitAreaRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _rating) {
        AreaRatingGiven(_rater, _to, _rating, _area, _jobId, _getVersion());
    }

    function emitCategoryRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _category, uint _rating) {
        CategoryRatingGiven(_rater, _to, _rating, _jobId, _area, _category, _getVersion());
    }

    function emitSkillRatingGiven(address _rater, address _to, uint _jobId, uint _area, uint _category, uint _skill, uint _rating) {
        SkillRatingGiven(_rater, _to, _rating, _jobId, _area, _category, _skill, _getVersion());
    }
}
