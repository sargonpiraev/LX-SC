pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract SkillsLibrary is EventsHistoryAndStorageAdapter, Owned {
    // Mappings of entity to IPFS hash.
    StorageInterface.UIntBytes32Mapping areas;
    StorageInterface.UIntUIntBytes32Mapping categories;
    StorageInterface.UIntUIntUIntBytes32Mapping skills;

    event AreaSet(uint area, bytes32 hash, uint version);
    event CategorySet(uint area, uint category, bytes32 hash, uint version);
    event SkillSet(uint area, uint category, uint skill, bytes32 hash, uint version);

    function SkillsLibrary(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        areas.init('areas');
        categories.init('categories');
        skills.init('skills');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function getArea(uint _area) constant returns(bytes32) {
        return store.get(areas, _area);
    }

    function getCategory(uint _area, uint _category) constant returns(bytes32) {
        return store.get(categories, _area, _category);
    }

    function getSkill(uint _area, uint _category, uint _skill) constant returns(bytes32) {
        return store.get(skills, _area, _category, _skill);
    }

    function setArea(uint _area, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(areas, _area, _hash);
        _emitAreaSet(_area, _hash);
        return true;
    }

    function setCategory(uint _area, uint _category, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(categories, _area, _category, _hash);
        _emitCategorySet(_area, _category, _hash);
        return true;
    }

    function setSkill(uint _area, uint _category, uint _skill, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(skills, _area, _category, _skill, _hash);
        _emitSkillSet(_area, _category, _skill, _hash);
        return true;
    }

    function _emitAreaSet(uint _area, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitAreaSet(_area, _hash);
    }

    function _emitCategorySet(uint _area, uint _category, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitCategorySet(_area, _category, _hash);
    }

    function _emitSkillSet(uint _area, uint _category, uint _skill, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitSkillSet(_area, _category, _skill, _hash);
    }

    function emitAreaSet(uint _area, bytes32 _hash) {
        AreaSet(_area, _hash, _getVersion());
    }

    function emitCategorySet(uint _area, uint _category, bytes32 _hash) {
        CategorySet(_area, _category, _hash, _getVersion());
    }

    function emitSkillSet(uint _area, uint _category, uint _skill, bytes32 _hash) {
        SkillSet(_area, _category, _skill, _hash, _getVersion());
    }
}
