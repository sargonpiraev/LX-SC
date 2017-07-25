pragma solidity 0.4.8;

import './adapters/MultiEventsHistoryAdapter.sol';
import './adapters/Roles2LibraryAdapter.sol';
import './adapters/StorageAdapter.sol';
import './base/BitOps.sol';
import './base/Owned.sol';


contract UserLibraryInterface {
    function hasArea(address _user, uint _area) returns(bool);
    function hasCategory(address _user, uint _area, uint _category) returns(bool);
    function hasSkill(address _user, uint _area, uint _category, uint _skill) returns(bool);
}

contract JobControllerInterface {
    function getJobState(uint _jobId) returns(uint);
    function getJobClient(uint _jobId) returns(address);
    function getJobWorker(uint _jobId) returns(address);
    function getJobSkillsArea(uint _jobId) returns(uint);
    function getJobSkillsCategory(uint _jobId) returns(uint);
    function getJobSkills(uint _jobId) returns(uint);
    function getFinalState(uint _jobId) returns(uint);
}

contract RatingsAndReputationLibrary is StorageAdapter, MultiEventsHistoryAdapter, Owned, Roles2LibraryAdapter, BitOps {
    JobControllerInterface jobController;
    UserLibraryInterface userLibrary;

    // Just a simple user-user rating, can be set by anyone, can be overwritten
    StorageInterface.AddressAddressUIntMapping userRatingsGiven;  // from => to => rating

    // Job rating, set only after job completion, can be set once both by client and worker
    // User has to set this rating after job is completed.
    StorageInterface.AddressUIntStructAddressUInt8Mapping jobRatingsGiven;  // to => jobId => {from, rating}

    // Job rating, set by client to worker. Can be set only once and can't be overwritten.
    // This rating tells how satisfied is client with worker's skills.
    // Client can skip setting this ratings if he is lazy.
    StorageInterface.AddressUIntUIntStructAddressUInt8Mapping areaRatingsGiven;  // to => jobId => area => {from, rating}
    StorageInterface.AddressUIntUIntUIntStructAddressUInt8Mapping categoryRatingsGiven;  // to => jobId => area => category => {from, rating}
    StorageInterface.AddressUIntUIntUIntUIntStructAddressUInt8Mapping skillRatingsGiven;  // to => jobId => area => category => skill => {from, rating}
    StorageInterface.UIntBoolMapping skillRatingSet;  // jobId => Whether rating was already set

    // Following ratings can be set only by evaluators anytime. Can be overwritten.
    StorageInterface.AddressUIntAddressUInt8Mapping areasEvaluated;
    StorageInterface.AddressUIntUIntAddressUInt8Mapping categoriesEvaluated;
    StorageInterface.AddressUIntUIntUIntAddressUInt8Mapping skillsEvaluated;

    event UserRatingGiven(address indexed rater, address indexed to, uint rating);
    event RatingGiven(address indexed rater, address indexed to, uint8 rating, uint jobId);
    event AreaRatingGiven(address indexed rater, address indexed to, uint8 rating, uint area, uint jobId);
    event CategoryRatingGiven(address indexed rater, address indexed to, uint8 rating, uint area, uint category, uint jobId);
    event SkillRatingGiven(address indexed rater, address indexed to, uint8 rating, uint area, uint category, uint skill, uint jobId);
    event AreaEvaluated(address indexed rater, address indexed to, uint8 rating, uint area);
    event CategoryEvaluated(address indexed rater, address indexed to, uint8 rating, uint area, uint category);
    event SkillEvaluated(address indexed rater, address indexed to, uint8 rating, uint area, uint category, uint skill);

    modifier canSetRating(uint _jobId, address _to) {
        if (
            jobController.getJobState(_jobId) != 7 ||  // Ensure job is FINALIZED
            jobController.getJobClient(_jobId) != msg.sender ||
            jobController.getJobWorker(_jobId) != _to
        ) {
            return;
        }
        _;
    }

    modifier canSetJobRating(uint _jobId, address _to) {
        var (rater, rating) = store.get(jobRatingsGiven, _to, _jobId);
        if (rating > 0) {
            return;
        }
        _;
    }

    modifier canSetSkillRating(uint _jobId) {
        if (
            jobController.getFinalState(_jobId) < 4 ||  // Ensure job is at least STARTED
            store.get(skillRatingSet, _jobId)  // Ensure skill rating wasn't set yet
        ) {
            return;
        }
        _;
    }

    function RatingsAndReputationLibrary(Storage _store, bytes32 _crate, address _roles2Library)
        StorageAdapter(_store, _crate)
        Roles2LibraryAdapter(_roles2Library)
    {
        jobRatingsGiven.init('jobRatingsGiven');
        userRatingsGiven.init('userRatingsGiven');
        areaRatingsGiven.init('areaRatingsGiven');
        categoryRatingsGiven.init('categoryRatingsGiven');
        skillRatingsGiven.init('skillRatingsGiven');
        skillRatingSet.init('skillRatingSet');
    }

    function setupEventsHistory(address _eventsHistory) auth() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setJobController(address _jobController) auth() returns(bool) {
        jobController = JobControllerInterface(_jobController);
        return true;
    }

    function setUserLibrary(address _userLibrary) auth() returns(bool) {
        userLibrary = UserLibraryInterface(_userLibrary);
        return true;
    }

    function getUserRating(address _rater, address _to) constant returns(uint) {
        return store.get(userRatingsGiven, _rater, _to);
    }

    function setUserRating(address _to, uint _rating) returns(bool) {
        if (_rating > 10) {
            return false;
        }
        store.set(userRatingsGiven, msg.sender, _to, _rating);
        _emitUserRatingGiven(msg.sender, _to, _rating);
        return true;
    }

    function getJobRating(address _to, uint _jobId) constant returns(address, uint8) {
        return store.get(jobRatingsGiven, _to, _jobId);
    }

    function setJobRating(address _to, uint8 _rating,  uint _jobId)
        canSetRating(_jobId, _to)
        canSetJobRating(_jobId, _to)
    returns(bool) {
        if (_rating > 10) {
            return false;
        }
        // Check if rating is already set
        store.set(jobRatingsGiven, _to, _jobId, msg.sender, _rating);
        _emitRatingGiven(msg.sender, _to, _jobId, _rating);
        return true;
    }

    function getAreaRating(address _to, uint _area, uint _jobId) constant returns(address, uint8) {
        return store.get(areaRatingsGiven, _to, _jobId, _area);
    }

    function getAreaEvaluation(address _to, uint _area, address _rater) constant returns(uint8) {
        return store.get(areasEvaluated, _to, _area, _rater);
    }

    function setAreaRating(address _to, uint8 _rating, uint _area,  uint _jobId)
        canSetRating(_jobId, _to)
        canSetSkillRating(_jobId)
    returns(bool) {
        return _setAreaRating(_to, _rating, _area, _jobId, false);
    }

    function _setAreaRating(address _to, uint8 _rating, uint _area,  uint _jobId, bool _throws)
        internal
    returns(bool) {
        if ((_rating > 10) || !userLibrary.hasArea(_to, _area)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(areaRatingsGiven, _to, _jobId, _area, msg.sender, _rating);
        store.set(skillRatingSet, _jobId, true);
        _emitAreaRatingGiven(msg.sender, _to, _rating, _area, _jobId);
        return true;
    }

    function evaluateArea(address _to, uint8 _rating, uint _area)
        auth()
    returns(bool) {
        return _evaluateArea(_to, _rating, _area, false);
    }

    function _evaluateArea(address _to, uint8 _rating, uint _area, bool _throws) internal returns(bool) {
        if ((_rating > 10) || !userLibrary.hasArea(_to, _area)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(areasEvaluated, _to, _area, msg.sender, _rating);
        _emitAreaEvaluated(msg.sender, _to, _rating, _area);
        return true;
    }

    function getCategoryRating(address _to, uint _area, uint _category, uint _jobId) constant returns(address, uint8) {
        return store.get(categoryRatingsGiven, _to, _jobId, _area, _category);
    }

    function getCategoryEvaluation(address _to, uint _area, uint _category, address _rater) constant returns(uint8) {
        return store.get(categoriesEvaluated, _to, _area, _category, _rater);
    }

    function setCategoryRating(address _to,  uint8 _rating, uint _area, uint _category, uint _jobId)
        canSetRating(_jobId, _to)
        canSetSkillRating(_jobId)
    returns(bool) {
        return _setCategoryRating(_to, _rating, _area, _category, _jobId, false);
    }

    function _setCategoryRating(address _to,  uint8 _rating, uint _area, uint _category, uint _jobId, bool _throws)
        internal
    returns(bool) {
        if ((_rating > 10) || !userLibrary.hasCategory(_to, _area, _category)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(categoryRatingsGiven, _to, _jobId, _area, _category, msg.sender, _rating);
        store.set(skillRatingSet, _jobId, true);
        _emitCategoryRatingGiven(msg.sender, _to, _rating, _area, _category, _jobId);
        return true;
    }

    function evaluateCategory(address _to, uint8 _rating, uint _area, uint _category)
        auth()
    returns(bool) {
        return _evaluateCategory(_to, _rating, _area, _category, false);
    }

    function _evaluateCategory(address _to, uint8 _rating, uint _area, uint _category, bool _throws)
        internal
    returns(bool) {
        if ((_rating > 10) || !userLibrary.hasCategory(_to, _area, _category)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(categoriesEvaluated, _to, _area, _category, msg.sender, _rating);
        _emitCategoryEvaluated(msg.sender, _to, _rating, _area, _category);
        return true;
    }

    function getSkillRating(address _to, uint _area, uint _category, uint _skill, uint _jobId)
        constant
    returns(address, uint8) {
        return store.get(skillRatingsGiven, _to, _jobId, _area, _category, _skill);
    }

    function getSkillEvaluation(address _to, uint _area, uint _category, uint _skill, address _rater)
        constant
    returns(uint8) {
        return store.get(skillsEvaluated, _to, _area, _category, _skill,  _rater);
    }

    function setSkillRating(address _to, uint8 _rating, uint _area, uint _category, uint _skill,  uint _jobId)
        canSetRating(_jobId, _to)
        canSetSkillRating(_jobId)
    returns(bool) {
        return _setSkillRating(_to, _rating, _area, _category, _skill, _jobId, false);
    }

    function _setSkillRating(address _to, uint8 _rating, uint _area, uint _category, uint _skill,  uint _jobId, bool _throws)
        internal
    returns(bool) {
        if ((_rating > 10) || !userLibrary.hasSkill(_to, _area, _category, _skill)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(skillRatingsGiven, _to, _jobId, _area, _category, _skill, msg.sender, _rating);
        store.set(skillRatingSet, _jobId, true);
        _emitSkillRatingGiven(msg.sender, _to, _rating, _area, _category, _skill, _jobId);
        return true;
    }

    function evaluateSkill(address _to, uint8 _rating, uint _area, uint _category, uint _skill)
        auth()
    returns(bool) {
        return _evaluateSkill(_to, _rating, _area, _category, _skill, false);
    }

    function _evaluateSkill(address _to, uint8 _rating, uint _area, uint _category, uint _skill, bool _throws) internal returns(bool) {
        if ((_rating > 10) || !userLibrary.hasSkill(_to, _area, _category, _skill)) {
            if (_throws) {
                throw;
            }
            return false;
        }
        store.set(skillsEvaluated, _to, _area, _category, _skill, msg.sender, _rating);
        _emitSkillEvaluated(msg.sender, _to, _rating, _area, _category, _skill);
        return true;
    }

    function evaluateMany(address _to, uint _areas, uint[] _categories, uint[] _skills, uint8[] _rating)
        auth()
    returns(bool) {
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
                _evaluateArea(_to, _rating[ratingCounter++], area, true);
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
                    _evaluateCategory(_to, _rating[ratingCounter++], area, category, true);
                    //exit when full category set
                    continue;
                }
                //check that skill is not empty
                if (_skills[skillsCounter] == 0) {
                    throw;
                }
                _evaluateSkill(_to, _rating[ratingCounter++], area, category, _skills[skillsCounter++], true);
                // Move to next skill
            }
            // Move to next category set
            categoriesCounter++;
        }
        return true;
    }

    function rateWorkerSkills(uint _jobId, address _to, uint _area, uint _category, uint[] _skills, uint8[] _ratings)
        singleOddFlag(_area)
        singleOddFlag(_category)
        canSetRating(_jobId, _to)
        canSetSkillRating(_jobId)
    returns(bool) {
        // Check if skills already set (maybe consider using flag)
        for (uint i = 0; i < _skills.length; i++) {
            _checkSetSkill(_jobId, _to, _ratings[i], _area, _category, _skills[i]);
        }
        store.set(skillRatingSet, _jobId, true);
        return true;
    }

    function _checkSetSkill(uint _jobId, address _to, uint8 _rating, uint _area, uint _category, uint _skill)
        internal
    {
        _assert(_hasFlag(jobController.getJobSkills(_jobId), _skill));
        _setSkillRating(_to, _rating, _area, _category, _skill, _jobId, true);
    }

    function _emitRatingGiven(address _rater, address _to, uint _jobId, uint8 _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitRatingGiven(_rater, _to, _jobId, _rating);
    }

    function _emitUserRatingGiven(address _rater, address _to, uint _rating) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitUserRatingGiven(_rater, _to, _rating);
    }

    function _emitAreaRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitAreaRatingGiven(_rater, _to, _rating, _area, _jobId);
    }

    function _emitCategoryRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitCategoryRatingGiven(_rater, _to, _rating, _area, _category, _jobId);
    }

    function _emitSkillRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _skill, uint _jobId) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitSkillRatingGiven(_rater, _to, _rating, _area, _category, _skill, _jobId);
    }

    function _emitAreaEvaluated(address _rater, address _to, uint8 _rating, uint _area) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitAreaEvaluated(_rater, _to, _rating, _area);
    }

    function _emitCategoryEvaluated(address _rater, address _to, uint8 _rating, uint _area, uint _category) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitCategoryEvaluated(_rater, _to, _rating, _area, _category);
    }

    function _emitSkillEvaluated(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _skill) internal {
        RatingsAndReputationLibrary(getEventsHistory()).emitSkillEvaluated(_rater, _to, _rating, _area, _category, _skill);
    }

    function emitRatingGiven(address _rater, address _to, uint _jobId, uint8 _rating) {
        RatingGiven(_rater, _to, _rating, _jobId);
    }

    function emitUserRatingGiven(address _rater, address _to, uint _rating) {
        UserRatingGiven(_rater, _to, _rating);
    }

    function emitAreaRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _jobId) {
        AreaRatingGiven(_rater, _to, _rating, _area, _jobId);
    }

    function emitCategoryRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _jobId) {
        CategoryRatingGiven(_rater, _to, _rating, _area, _category, _jobId);
    }

    function emitSkillRatingGiven(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _skill, uint _jobId) {
        SkillRatingGiven(_rater, _to, _rating, _area, _category, _skill, _jobId);
    }

    function emitAreaEvaluated(address _rater, address _to, uint8 _rating, uint _area) {
        AreaEvaluated(_rater, _to, _rating, _area);
    }

    function emitCategoryEvaluated(address _rater, address _to, uint8 _rating, uint _area, uint _category) {
        CategoryEvaluated(_rater, _to, _rating, _area, _category);
    }

    function emitSkillEvaluated(address _rater, address _to, uint8 _rating, uint _area, uint _category, uint _skill) {
        SkillEvaluated(_rater, _to, _rating, _area, _category, _skill);
    }

    function _assert(bool _assertion) internal {
        if (!_assertion) {
            throw;
        }
    }
}
