pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract SkillsLibrary is EventsHistoryAndStorageAdapter, Owned {
    // Mappings of entity to IPFS hash.
    StorageInterface.UIntBytes32Mapping areas;
    StorageInterface.UIntUIntBytes32Mapping categories;
    StorageInterface.UIntUIntUIntBytes32Mapping skills;

    event AreaSet(uint areaId, bytes32 hash, uint version);
    event CategorySet(uint areaId, uint categoryId, bytes32 hash, uint version);
    event SkillSet(uint areaId, uint categoryId, uint skillId, bytes32 hash, uint version);

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

    function getArea(uint _areaId) constant returns(bytes32) {
        return store.get(areas, _areaId);
    }

    function getCategory(uint _areaId, uint _categoryId) constant returns(bytes32) {
        return store.get(categories, _areaId, _categoryId);
    }

    function getSkill(uint _areaId, uint _categoryId, uint _skillId) constant returns(bytes32) {
        return store.get(skills, _areaId, _categoryId, _skillId);
    }

    function setArea(uint _areaId, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(areas, _areaId, _hash);
        _emitAreaSet(_areaId, _hash);
        return true;
    }

    function setCategory(uint _areaId, uint _categoryId, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(categories, _areaId, _categoryId, _hash);
        _emitCategorySet(_areaId, _categoryId, _hash);
        return true;
    }

    function setSkill(uint _areaId, uint _categoryId, uint _skillId, bytes32 _hash) onlyContractOwner() returns(bool) {
        store.set(skills, _areaId, _categoryId, _skillId, _hash);
        _emitSkillSet(_areaId, _categoryId, _skillId, _hash);
        return true;
    }

    function _emitAreaSet(uint _areaId, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitAreaSet(_areaId, _hash);
    }

    function _emitCategorySet(uint _areaId, uint _categoryId, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitCategorySet(_areaId, _categoryId, _hash);
    }

    function _emitSkillSet(uint _areaId, uint _categoryId, uint _skillId, bytes32 _hash) internal {
        SkillsLibrary(getEventsHistory()).emitSkillSet(_areaId, _categoryId, _skillId, _hash);
    }

    function emitAreaSet(uint _areaId, bytes32 _hash) {
        AreaSet(_areaId, _hash, _getVersion());
    }

    function emitCategorySet(uint _areaId, uint _categoryId, bytes32 _hash) {
        CategorySet(_areaId, _categoryId, _hash, _getVersion());
    }

    function emitSkillSet(uint _areaId, uint _categoryId, uint _skillId, bytes32 _hash) {
        SkillSet(_areaId, _categoryId, _skillId, _hash, _getVersion());
    }
}
