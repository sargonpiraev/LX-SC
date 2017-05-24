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
    bytes32 public constant SKILL_RATE_ROLE = "evaluator";
    bytes32 public constant RATE_ROLE = "client";
    UserLibrary userLibrary;

    event UserRatingGiven(address indexed rater, address indexed to, uint rating, uint version);
    event RatingGiven(address indexed rater, address indexed to, uint rating, uint jobId, uint version);
    event AreaRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint jobId, uint version);
    event CategoryRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint _category, uint jobId, uint version);
    event SkillRatingGiven(address indexed rater, address indexed to, uint rating, uint _area, uint _category, uint _skill, uint jobId, uint version);

    modifier canSetSkillRating(address user) {
        if(!userLibrary.hasRole(user, SKILL_RATE_ROLE)){
            return;  
        }
        _;
    }

    modifier canSetRating(address user) {
        if(!userLibrary.hasRole(user, RATE_ROLE)){
          return;  
        }
        _;
    }

    modifier isValidRating(uint _rating){
        if(_rating > 10) {
            return;  
        }
        _;
    }

    modifier singleFlag(uint _flag) {
        if (!_isSingleFlag(_flag)) {
            return;
        }
        _;
    }

    modifier singleOddFlag(uint _flag) {
        if (!_isSingleFlag(_flag) || !_isOddFlag(_flag)) {
            return;
        }
        _;
    }

    function _isSingleFlag(uint _flag) constant internal returns(bool) {
        return _flag != 0 && (_flag & (_flag - 1) == 0);
    }

    function _isOddFlag(uint _flag) constant internal returns(bool) {
        return _flag & 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa == 0;
    }

    function _isFullOrNull(uint _flags, uint _flag) constant internal returns(bool) {
        return !_hasFlag(_flags, _flag) || _hasFlag(_flags, _flag << 1);
    }

    function _ifEvenThenOddTooFlags(uint _flags) constant internal returns(bool) {
        uint flagsEvenOddMask = (_flags & 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa) >> 1;
        return (_flags & flagsEvenOddMask) == flagsEvenOddMask;
    }

    function _hasFlag(uint _flags, uint _flag) internal constant returns(bool) {
        return _flags & _flag != 0;
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

    function setRating(address _to, uint _rating,  uint _jobId) 
        isValidRating(_rating) 
        canSetRating(msg.sender) 
    returns(bool) {
        store.set(ratingsGiven, _to, _jobId, msg.sender, _rating);
        _emitRatingGiven(msg.sender, _to, _jobId, _rating);
        return true;
    }

    function getAreaRating(address _to, uint _area, uint _jobId) constant returns(address, uint) {
        return store.get(areaRatingsGiven, _to, _jobId, _area);
    }

    function setAreaRating(address _to, uint _area, uint _rating,  uint _jobId) 
        isValidRating(_rating) 
        canSetSkillRating(msg.sender) 
    returns(bool) {
        if(!userLibrary.hasArea(_to, _area)){
            return false;
        }
        store.set(areaRatingsGiven, _to, _jobId, _area, msg.sender, _rating);
        _emitAreaRatingGiven(msg.sender, _to, _jobId, _area, _rating);
        return true;
    }

    function getCategoryRating(address _to, uint _area, uint _category, uint _jobId) constant returns(address, uint) {
        return store.get(categoryRatingsGiven, _to, _jobId, _area, _category);
    }

    function setCategoryRating(address _to, uint _area, uint _category, uint _rating, uint _jobId) 
        isValidRating(_rating) 
        canSetSkillRating(msg.sender) 
    returns(bool) {
        if(!userLibrary.hasCategory(_to, _area, _category)){
            return false;
        }
        store.set(categoryRatingsGiven, _to, _jobId, _area, _category, msg.sender, _rating);
        _emitCategoryRatingGiven(msg.sender, _to, _jobId, _area, _category, _rating);
        return true;
    }

    function getSkillRating(address _to, uint _area, uint _category, uint _skill, uint _jobId) constant returns(address, uint) {
        return store.get(skillRatingsGiven, _to, _jobId, _area, _category, _skill);
    }

    function setSkillRating(address _to, uint _area, uint _category, uint _skill, uint _rating,  uint _jobId) 
        isValidRating(_rating)
        canSetSkillRating(msg.sender)
    returns(bool) {
        if(!userLibrary.hasSkill(_to, _area, _category, _skill)){
            return false;
        }
        store.set(skillRatingsGiven, _to, _jobId, _area, _category, _skill, msg.sender, _rating);
        _emitSkillRatingGiven(msg.sender, _to, _jobId, _area, _category, _skill, _rating);
        return true;
    }

    function setMany(address _to, uint _areas, uint[] _categories, uint[] _skills, uint[] _rating,  uint _jobId) 
        canSetSkillRating(msg.sender)
    returns(bool){
        uint categoriesCounter = 0;
        uint skillsCounter = 0;
        uint ratingCounter = 0;
        if (!_ifEvenThenOddTooFlags(_areas)) {
            return false;
        }
        for (uint area = 1; area != 0; area = area << 2) {
            if(!userLibrary.hasArea(_to, area)){
                throw;
            }
            if (_isFullOrNull(_areas, area)) {
                setAreaRating(_to, area, _rating[ratingCounter++], _jobId);
                continue;
            }
            if (!_ifEvenThenOddTooFlags(_categories[categoriesCounter])) {
                throw;
            }
            if (_categories[categoriesCounter] == 0) {
                throw;
            }
            for (uint category = 1; category != 0; category = category << 2) {
                if(!userLibrary.hasCategory(_to, area, category)){
                    throw;
                }
                if (_isFullOrNull(_categories[categoriesCounter], category)) {
                    setCategoryRating(_to, area, category, _rating[ratingCounter++], _jobId);
                    continue;
                }
                if (_skills[skillsCounter] == 0) {
                    throw;
                }
                if(!userLibrary.hasSkill(_to, area, category, _skills[skillsCounter])){
                    throw;
                }
                setSkillRating(_to, area, category, _skills[skillsCounter], _rating[ratingCounter++], _jobId);
                // Move to next skill
                skillsCounter += 1;
            }
            // Move to next category set
            categoriesCounter += 1;
        }
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
