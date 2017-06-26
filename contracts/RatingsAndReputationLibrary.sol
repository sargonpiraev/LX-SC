pragma solidity 0.4.8;

import './Owned.sol';
import './UserLibrary.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract RatingsAndReputationLibrary is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.AddressAddressUIntMapping userRatingsGiven;
    StorageInterface.AddressUIntStructAddressInt8Mapping ratingsGiven;
    StorageInterface.AddressUIntUIntStructAddressInt8Mapping areaRatingsGiven;
    StorageInterface.AddressUIntUIntUIntStructAddressInt8Mapping categoryRatingsGiven;
    StorageInterface.AddressUIntUIntUIntUIntStructAddressInt8Mapping skillRatingsGiven;
    StorageInterface.AddressUIntAddressInt8Mapping areasEvaluated;
    StorageInterface.AddressUIntUIntAddressInt8Mapping categoriesEvaluated;
    StorageInterface.AddressUIntUIntUIntAddressInt8Mapping skillsEvaluated;
    bytes32 public constant SKILL_RATE_ROLE = "skillRater";
    bytes32 public constant RATE_ROLE = "simpleRater";
    UserLibrary userLibrary;

    event UserRatingGiven(address indexed rater, address indexed to, uint rating, uint version);
    event RatingGiven(address indexed rater, address indexed to, int8 rating, uint jobId, uint version);
    event AreaRatingGiven(address indexed rater, address indexed to, int8 rating, uint area, uint jobId, uint version);
    event CategoryRatingGiven(address indexed rater, address indexed to, int8 rating, uint area, uint category, uint jobId, uint version);
    event SkillRatingGiven(address indexed rater, address indexed to, int8 rating, uint area, uint category, uint skill, uint jobId, uint version);
    event AreaEvaluated(address indexed rater, address indexed to, int8 rating, uint area, uint version);
    event CategoryEvaluated(address indexed rater, address indexed to, int8 rating, uint area, uint category, uint version);
    event SkillEvaluated(address indexed rater, address indexed to, int8 rating, uint area, uint category, uint skill, uint version);

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

    modifier isValidRating(int8 _rating){
        if(_rating > 10 || _rating < 0) {
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

    function setUserRating(address _otherUser, uint _rating) returns(bool) {
        if (_rating > 10 || _rating < 0) {
            return false;
        }
        store.set(userRatingsGiven, msg.sender, _otherUser, _rating);
        _emitUserRatingGiven(msg.sender, _otherUser, _rating);
        return true;
    }

    function getRating(address _to, uint _jobId) constant returns(address, int8) {
        return store.get(ratingsGiven, _to, _jobId);
    }

    function setRating(address _to, int8 _rating,  uint _jobId) 
        isValidRating(_rating) 
        canSetRating(msg.sender) 
    returns(bool) {
        store.set(ratingsGiven, _to, _jobId, msg.sender, _rating);
        _emitRatingGiven(msg.sender, _to, _jobId, _rating);
        return true;
    }

    function getAreaRating(address _to, uint _area, uint _jobId) constant returns(address, int8) {
        return store.get(areaRatingsGiven, _to, _jobId, _area);
    }

    function getAreaEvaluation(address _to, uint _area, address _rater) constant returns(int8) {
        return store.get(areasEvaluated, _to, _area, _rater);
    }

    function setAreaRating(address _to, int8 _rating, uint _area,  uint _jobId) 
        canSetRating(msg.sender) 
    returns(bool) {
        return _setAreaRating(_to, _rating, _area, _jobId, false);
    }

    function _setAreaRating(address _to, int8 _rating, uint _area,  uint _jobId, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasArea(_to, _area)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        }
        store.set(areaRatingsGiven, _to, _jobId, _area, msg.sender, _rating);
        _emitAreaRatingGiven(msg.sender, _to, _rating, _area, _jobId);
        return true;
    }

    function evaluateArea(address _to, int8 _rating, uint _area) 
        canSetSkillRating(msg.sender) 
    returns(bool) {
        return _evaluateArea(_to, _rating, _area, false);
    }

    function _evaluateArea(address _to, int8 _rating, uint _area, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasArea(_to, _area)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        }
        store.set(areasEvaluated, _to, _area, msg.sender, _rating);
        _emitAreaEvaluated(msg.sender, _to, _rating, _area);
        return true;
    }

    function getCategoryRating(address _to, uint _area, uint _category, uint _jobId) constant returns(address, int8) {
        return store.get(categoryRatingsGiven, _to, _jobId, _area, _category);
    }

    function getCategoryEvaluation(address _to, uint _area, uint _category, address _rater) constant returns(int8) {
        return store.get(categoriesEvaluated, _to, _area, _category, _rater);
    }

    function setCategoryRating(address _to,  int8 _rating, uint _area, uint _category, uint _jobId) 
        canSetRating(msg.sender) 
    returns(bool) {
        return _setCategoryRating(_to, _rating, _area, _category, _jobId, false);
    }

    function _setCategoryRating(address _to,  int8 _rating, uint _area, uint _category, uint _jobId, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasCategory(_to, _area, _category)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        }
        store.set(categoryRatingsGiven, _to, _jobId, _area, _category, msg.sender, _rating);
        _emitCategoryRatingGiven(msg.sender, _to, _rating, _area, _category, _jobId);
        return true;
    }

    function evaluateCategory(address _to, int8 _rating, uint _area, uint _category) 
        canSetSkillRating(msg.sender) 
    returns(bool) {
        return _evaluateCategory(_to, _rating, _area, _category, false);
    }

    function _evaluateCategory(address _to, int8 _rating, uint _area, uint _category, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasCategory(_to, _area, _category)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        }
        store.set(categoriesEvaluated, _to, _area, _category, msg.sender, _rating);
        _emitCategoryEvaluated(msg.sender, _to, _rating, _area, _category);
        return true;
    }

    function getSkillRating(address _to, uint _area, uint _category, uint _skill, uint _jobId) constant returns(address, int8) {
        return store.get(skillRatingsGiven, _to, _jobId, _area, _category, _skill);
    }

    function getSkillEvaluation(address _to, uint _area, uint _category, uint _skill, address _rater) constant returns(int8) {
        return store.get(skillsEvaluated, _to, _area, _category, _skill,  _rater);
    }

    function setSkillRating(address _to, int8 _rating, uint _area, uint _category, uint _skill,  uint _jobId) 
        canSetRating(msg.sender)
    returns(bool) {
        return _setSkillRating(_to, _rating, _area, _category, _skill, _jobId, false);
    }
    
    function _setSkillRating(address _to, int8 _rating, uint _area, uint _category, uint _skill,  uint _jobId, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasSkill(_to, _area, _category, _skill)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        } 
        store.set(skillRatingsGiven, _to, _jobId, _area, _category, _skill, msg.sender, _rating);
        _emitSkillRatingGiven(msg.sender, _to, _rating, _area, _category, _skill, _jobId);
        return true;
    }

    function evaluateSkill(address _to, int8 _rating, uint _area, uint _category, uint _skill) 
        canSetSkillRating(msg.sender)
    returns(bool) {
        return _evaluateSkill(_to, _rating, _area, _category, _skill, false);
    }

    function _evaluateSkill(address _to, int8 _rating, uint _area, uint _category, uint _skill, bool _throws) returns(bool) {
        if((_rating > 10 || _rating < 0) || !userLibrary.hasSkill(_to, _area, _category, _skill)) { 
            if(_throws) {
                throw;
            } else {
                return false;
            } 
        } 
        store.set(skillsEvaluated, _to, _area, _category, _skill, msg.sender, _rating);
        _emitSkillEvaluated(msg.sender, _to, _rating, _area, _category, _skill);
        return true;
    }

    function evaluateMany(address _to, uint _areas, uint[] _categories, uint[] _skills, int8[] _rating) 
        canSetSkillRating(msg.sender)
    returns(bool){
        uint categoriesCounter = 0;
        uint skillsCounter = 0;
        uint ratingCounter = 0;
        //check that areas have correct format
        if (!_ifEvenThenOddTooFlags(_areas)) {
            return false;
        }
        for (uint area = 1; area != 0; area = area << 2) {
            if (!_hasFlag(_areas, area)){
                continue;
            }
            //check if area is full
            if (_hasFlag(_areas, area << 1)) { 
                _evaluateArea(_to, _rating[ratingCounter], area, true);
                ratingCounter++;
                //area is full, no need to go further to category checks
                continue;
            }
            //check that category has correct format
            if (!_ifEvenThenOddTooFlags(_categories[categoriesCounter])) {
                throw;
            }
            //check that category is not empty
            if (_categories[categoriesCounter] == 0) {
                throw;
            }
            //iterating through category to setup skills
            for (uint category = 1; category != 0; category = category << 2) {
                if (!_hasFlag(_categories[categoriesCounter], category)){
                    continue;
                }
                //check if category is full
                if (_hasFlag(_categories[categoriesCounter], category << 1)) {
                    _evaluateCategory(_to, _rating[ratingCounter], area, category, true);
                    ratingCounter++;
                    //exit when full category set
                    continue;
                }
                //check that skill is not empty
                if (_skills[skillsCounter] == 0) {
                    throw;
                }
                _evaluateSkill(_to, _rating[ratingCounter], area, category, _skills[skillsCounter], true);
                ratingCounter++;
                // Move to next skill
                skillsCounter += 1;
                
            }
            // Move to next category set
            categoriesCounter += 1;
        }
        return true;
    }

    function setManyRatings(address _to, uint _areas, uint[] _categories, uint[] _skills, int8[] _rating,  uint _jobId) 
        canSetRating(msg.sender)
    returns(bool){
        uint categoriesCounter = 0;
        uint skillsCounter = 0;
        uint ratingCounter = 0;
        //check that areas have correct format
        if (!_ifEvenThenOddTooFlags(_areas)) {
            return false;
        }
        for (uint area = 1; area != 0; area = area << 2) {
            if (!_hasFlag(_areas, area)){
                continue;
            }
            //check if area is full
            if (_hasFlag(_areas, area << 1)) { 
                _setAreaRating(_to,  _rating[ratingCounter], area, _jobId, true);
                ratingCounter++;
                //area is full, no need to go further to category checks
                continue;
            }
            //check that category has correct format
            if (!_ifEvenThenOddTooFlags(_categories[categoriesCounter])) {
                throw;
            }
            //check that category is not empty
            if (_categories[categoriesCounter] == 0) {
                throw;
            }
            //iterating through category to setup skills
            for (uint category = 1; category != 0; category = category << 2) {
                if (!_hasFlag(_categories[categoriesCounter], category)){
                    continue;
                }
                //check if category is full
                if (_hasFlag(_categories[categoriesCounter], category << 1)) {
                    _setCategoryRating(_to, _rating[ratingCounter], area, category, _jobId, true);
                    ratingCounter++;
                    //exit when full category set
                    continue;
                }
                //check that skill is not empty
                if (_skills[skillsCounter] == 0) {
                    throw;
                }
                _setSkillRating(_to, _rating[ratingCounter], area, category,  _skills[skillsCounter], _jobId, true);
                ratingCounter++;
                // Move to next skill
                skillsCounter += 1;
            }
            // Move to next category set
            categoriesCounter += 1;
        }
        return true;
    }

    // function _setMany(address _to, uint _areas, uint[] _categories, uint[] _skills, int8[] _rating,  uint _jobId) returns(bool) {
    //     uint categoriesCounter = 0;
    //     uint skillsCounter = 0;
    //     uint ratingCounter = 0;
    //     //check that areas have correct format
    //     if (!_ifEvenThenOddTooFlags(_areas)) {
    //         return false;
    //     }
    //     for (uint area = 1; area != 0; area = area << 2) {
    //         if (!_hasFlag(_areas, area)){
    //             continue;
    //         }
    //         //check if area is full
    //         if (_hasFlag(_areas, area << 1)) { 
    //             //exit if user doesn't have this area
    //             if(!userLibrary.hasArea(_to, area)){
    //                 throw;
    //             }
    //             //check for correct input rating
    //             if(_rating[ratingCounter] > 10 || _rating[ratingCounter] < 0){
    //                 throw;
    //             }
    //             // if(_jobId == 0){
    //                 // store.set(areasEvaluated, _to, area, msg.sender, _rating[ratingCounter]);
    //                 // _emitAreaEvaluated(msg.sender, _to, _rating[ratingCounter++], area);
    //             // } else {
    //                 store.set(areaRatingsGiven, _to, _jobId, area, msg.sender, _rating[ratingCounter]);
    //                 _emitAreaRatingGiven(msg.sender, _to, _rating[ratingCounter++], area, _jobId);
    //             // }
    //             //area is full, no need to go further to category checks
    //             continue;
    //         }
    //         //check that category has correct format
    //         if (!_ifEvenThenOddTooFlags(_categories[categoriesCounter])) {
    //             throw;
    //         }
    //         //check that category is not empty
    //         if (_categories[categoriesCounter] == 0) {
    //             throw;
    //         }
    //         //iterating through category to setup skills
    //         for (uint category = 1; category != 0; category = category << 2) {
    //             if (!_hasFlag(_categories[categoriesCounter], category)){
    //                 continue;
    //             }
    //             //check if category is full
    //             if (_hasFlag(_categories[categoriesCounter], category << 1)) {
    //                 //check is user has this category
    //                 if(!userLibrary.hasCategory(_to, area, category)){
    //                     throw;
    //                 }
    //                 //check for correct input rating
    //                 if(_rating[ratingCounter] > 10 || _rating[ratingCounter] < 0) {
    //                     throw;
    //                 }
    //                 // if(_jobId == 0){
    //                     // store.set(categoriesEvaluated, _to, area, category, msg.sender, _rating[ratingCounter]);
    //                     // _emitCategoryEvaluated(msg.sender, _to, _rating[ratingCounter++], area, category);
    //                 // } else {
    //                     store.set(categoryRatingsGiven, _to, _jobId, area, category, msg.sender, _rating[ratingCounter]);
    //                     _emitCategoryRatingGiven(msg.sender, _to, _rating[ratingCounter++], area, category, _jobId);
    //                 // }
    //                 //exit when full category set
    //                 continue;
    //             }
    //             //check that skill is not empty
    //             if (_skills[skillsCounter] == 0) {
    //                 throw;
    //             }
    //             //check that user has this skill
    //             if (!userLibrary.hasSkill(_to, area, category, _skills[skillsCounter])){
    //                 throw;
    //             }
    //             // if(_jobId == 0){
    //                 // store.set(skillsEvaluated, _to, area, category, _skills[skillsCounter], msg.sender, _rating[ratingCounter]);
    //                 // _emitSkillEvaluated(msg.sender, _to, _rating[ratingCounter++], area, category, _skills[skillsCounter]);
    //             // } else {
    //                 store.set(skillRatingsGiven, _to, _jobId, area, category, _skills[skillsCounter], msg.sender, _rating[ratingCounter]);
    //                 _emitSkillRatingGiven(msg.sender, _to, _rating[ratingCounter++], area, category, _skills[skillsCounter], _jobId);
    //             // }
    //             // Move to next skill
    //             skillsCounter += 1;
                
    //         }
    //         // Move to next category set
    //         categoriesCounter += 1;
    //     }
    //     return true;
    // }

    function _emitRatingGiven(address _rater, address _to, uint _jobId, int8 _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitRatingGiven(_rater, _to, _jobId, _rating);
    }

    function _emitUserRatingGiven(address _rater, address _to, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitUserRatingGiven(_rater, _to, _rating);
    }

    function _emitAreaRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitAreaRatingGiven(_rater, _to, _rating, _area, _jobId);
    }

    function _emitCategoryRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitCategoryRatingGiven(_rater, _to, _rating, _area, _category, _jobId);
    }
    
    function _emitSkillRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _skill, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitSkillRatingGiven(_rater, _to, _rating, _area, _category, _skill, _jobId);
    }

    function _emitAreaEvaluated(address _rater, address _to, int8 _rating, uint _area) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitAreaEvaluated(_rater, _to, _rating, _area);
    }

    function _emitCategoryEvaluated(address _rater, address _to, int8 _rating, uint _area, uint _category) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitCategoryEvaluated(_rater, _to, _rating, _area, _category);
    }

    function _emitSkillEvaluated(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _skill) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitSkillEvaluated(_rater, _to, _rating, _area, _category, _skill);
    }

    function emitRatingGiven(address _rater, address _to, uint _jobId, int8 _rating) {
        RatingGiven(_rater, _to, _rating, _jobId, _getVersion());
    }
    
    function emitUserRatingGiven(address _rater, address _to, uint _rating) {
        UserRatingGiven(_rater, _to, _rating, _getVersion());
    }
    
    function emitAreaRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _jobId) {
        AreaRatingGiven(_rater, _to, _rating, _area, _jobId, _getVersion());
    }

    function emitCategoryRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _jobId) {
        CategoryRatingGiven(_rater, _to, _rating, _area, _category, _jobId, _getVersion());
    }

    function emitSkillRatingGiven(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _skill, uint _jobId) {
        SkillRatingGiven(_rater, _to, _rating, _area, _category, _skill, _jobId,_getVersion());
    }

    function emitAreaEvaluated(address _rater, address _to, int8 _rating, uint _area) {
        AreaEvaluated(_rater, _to, _rating, _area, _getVersion());
    }

    function emitCategoryEvaluated(address _rater, address _to, int8 _rating, uint _area, uint _category) {
        CategoryEvaluated(_rater, _to, _rating, _area, _category, _getVersion());
    }

    function emitSkillEvaluated(address _rater, address _to, int8 _rating, uint _area, uint _category, uint _skill) {
        SkillEvaluated(_rater, _to, _rating, _area, _category, _skill, _getVersion());
    }
}
