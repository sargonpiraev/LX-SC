pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract RolesLibraryInterface {
    function count() constant returns(uint);
    function includes(bytes32 _role) constant returns(bool);
    function getRole(uint _index) constant returns(bytes32);
}

contract UserLibrary is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.Mapping roles;
    StorageInterface.Address rolesLibrary;
    StorageInterface.AddressUIntMapping skillAreas;
    StorageInterface.AddressUIntUIntMapping skillCategories;
    StorageInterface.AddressUIntUIntUIntMapping skills;
    StorageInterface.Address skillsLibrary;

    event RoleAdded(address indexed user, bytes32 indexed role, uint version);
    event RoleRemoved(address indexed user, bytes32 indexed role, uint version);

    event SkillAreasSet(address indexed user, uint areas, uint version);
    event SkillCategoriesSet(address indexed user, uint indexed area, uint categories, uint version);
    event SkillsSet(address indexed user, uint indexed area, uint indexed category, uint skills, uint version);

    function UserLibrary(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        roles.init('roles');
        rolesLibrary.init('rolesLibrary');
        skillAreas.init('skillAreas');
        skillCategories.init('skillCategories');
        skills.init('skills');
        skillsLibrary.init('skillsLibrary');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setRolesLibrary(address _rolesLibrary) onlyContractOwner() returns(bool) {
        store.set(rolesLibrary, _rolesLibrary);
    }

    function setSkillsLibrary(address _skillsLibrary) onlyContractOwner() returns(bool) {
        store.set(skillsLibrary, _skillsLibrary);
    }

    // Will return user role only if it is present in RolesLibrary.
    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return getRolesLibrary().includes(_role) && store.get(roles, bytes32(_user), _role).toBool();
    }

    function getAreaInfo(address _user, uint _area) constant returns(bool partialArea, bool fullArea) {
        uint areas = store.get(skillAreas, _user);
        return (_hasFlag(areas, _area), _hasFlag(areas, _area << 1));
    }

    function hasArea(address _user, uint _area) constant returns(bool) {
        var (partial,) = getAreaInfo(_user, _area);
        return partial;
    }

    function getCategoryInfo(address _user, uint _area, uint _category) constant returns(bool partialCategory, bool fullCategory) {
        var (partialArea, fullArea) = getAreaInfo(_user, _area);
        if (!partialArea) {
            return (false, false);
        }
        if (fullArea) {
            return (true, true);
        }
        uint categories = store.get(skillCategories, _user, _area);
        return (_hasFlag(categories, _category), _hasFlag(categories, _category << 1));
    }

    function hasCategory(address _user, uint _area, uint _category) constant returns(bool) {
        var (partial,) = getCategoryInfo(_user, _area, _category);
        return partial;
    }

    function hasSkill(address _user, uint _area, uint _category, uint _skill) constant returns(bool) {
        var (partialCategory, fullCategory) = getCategoryInfo(_user, _area, _category);
        if (!partialCategory) {
            return false;
        }
        if (fullCategory) {
            return true;
        }
        uint userSkills = store.get(skills, _user, _area, _category);
        return _hasFlag(userSkills, _skill);
    }

    uint[] tempCategories;
    uint[] tempSkills;
    function getUserSkills(address _user) constant returns(uint, uint[], uint[]) {
        tempCategories.length = 0;
        tempSkills.length = 0;
        uint areas = store.get(skillAreas, _user);
        for (uint area = 1; area <= 0x8000000000000000000000000000000000000000000000000000000000000000; area = area << 2) {
            if (!_hasFlag(areas, area)) {
                continue;
            }
            if (_hasFlag(areas, area << 1)) {
                continue;
            }
            tempCategories.push(store.get(skillCategories, _user, area));
            for (uint category = 1; category <= 0x8000000000000000000000000000000000000000000000000000000000000000; category = category << 2) {
                if (!_hasFlag(tempCategories[tempCategories.length - 1], category)) {
                    continue;
                }
                if (_hasFlag(tempCategories[tempCategories.length - 1], category << 1)) {
                    continue;
                }
                tempSkills.push(store.get(skills, _user, area, category));
            }
        }
        return (areas, tempCategories, tempSkills);
    }

    function _hasFlag(uint _flags, uint _flag) internal constant returns(bool) {
        return _flags & _flag != 0;
    }

    bytes32[] temp;
    // Will only return roles that are present in RolesLibrary.
    function getUserRoles(address _user) constant returns(bytes32[]) {
        temp.length = 0;
        bytes32[] memory uniques = _getRoles();
        for (uint i = 0; i < uniques.length; i++) {
            if (hasRole(_user, uniques[i])) {
                temp.push(uniques[i]);
            }
        }
        return temp;
    }

    function _getRoles() constant internal returns(bytes32[]) {
        var rolesLib = getRolesLibrary();
        uint count = rolesLib.count();
        bytes32[] memory uniques = new bytes32[](count);
        for (uint i = 0; i < count; i++) {
            uniques[i] = rolesLib.getRole(i);
        }
        return uniques;
    }

    function getRolesLibrary() constant returns(RolesLibraryInterface) {
        return RolesLibraryInterface(store.get(rolesLibrary));
    }

    // Will add role only if it is present in RolesLibrary.
    function addRole(address _user, bytes32 _role) onlyContractOwner() returns(bool) {
        if (!getRolesLibrary().includes(_role)) {
            return false;
        }
        _setRole(_user, _role, true);
        _emitRoleAdded(_user, _role);
        return true;
    }

    function setAreas(address _user, uint _areas) onlyContractOwner() returns(bool) {
        _setAreas(_user, _areas);
        return true;
    }

    function setCategory(address _user, uint _area, uint _categories) onlyContractOwner() returns(bool) {
        _setCategories(_user, _area, _categories);
        return true;
    }

    function setSkills(address _user, uint _area, uint _category, uint _skills) onlyContractOwner() returns(bool) {
        _setSkills(_user, _area, _category, _skills);
        return true;
    }

    function setMany(address _user, uint _areas, uint[] _categories, uint[] _skills)  onlyContractOwner() returns(bool) {
        uint categoriesCounter = 0;
        uint skillsCounter = 0;
        _setAreas(_user, _areas);
        for (uint area = 1; area <= 0x8000000000000000000000000000000000000000000000000000000000000000; area = area << 2) {
            if (!_hasFlag(_areas, area)) {
                continue;
            }
            if (_hasFlag(_areas, area << 1)) {
                continue;
            }
            _setCategories(_user, area, _categories[categoriesCounter]);
            for (uint category = 1; category <= 0x8000000000000000000000000000000000000000000000000000000000000000; category = category << 2) {
                if (!_hasFlag(_categories[categoriesCounter], category)) {
                    continue;
                }
                if (_hasFlag(_categories[categoriesCounter], category << 1)) {
                    continue;
                }
                _setSkills(_user, area, category, _skills[skillsCounter]);
                skillsCounter += 1;
            }
            categoriesCounter += 1;
        }
        return true;
    }

    function removeRole(address _user, bytes32 _role) onlyContractOwner() returns(bool) {
        _setRole(_user, _role, false);
        _emitRoleRemoved(_user, _role);
        return true;
    }

    function _setAreas(address _user, uint _areas) internal {
        store.set(skillAreas, _user, _areas);
        _emitSkillAreasSet(_user, _areas);
    }

    function _setCategories(address _user, uint _area, uint _categories) internal {
        store.set(skillCategories, _user, _area, _categories);
        _emitSkillCategoriesSet(_user, _area, _categories);
    }

    function _setSkills(address _user, uint _area, uint _category, uint _skills) internal {
        store.set(skills, _user, _area, _category, _skills);
        _emitSkillsSet(_user, _area, _category, _skills);
    }

    function _setRole(address _user, bytes32 _role, bool _status) internal {
        store.set(roles, bytes32(_user), _role, _status.toBytes32());
    }

    function _emitRoleAdded(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitRoleAdded(_user, _role);
    }

    function _emitRoleRemoved(address _user, bytes32 _role) internal {
        UserLibrary(getEventsHistory()).emitRoleRemoved(_user, _role);
    }

    function _emitSkillAreasSet(address _user, uint _areas) internal {
        UserLibrary(getEventsHistory()).emitSkillAreasSet(_user, _areas);
    }

    function _emitSkillCategoriesSet(address _user, uint _area, uint _categories) internal {
        UserLibrary(getEventsHistory()).emitSkillCategoriesSet(_user, _area, _categories);
    }

    function _emitSkillsSet(address _user, uint _area, uint _category, uint _skills) internal {
        UserLibrary(getEventsHistory()).emitSkillsSet(_user, _area, _category, _skills);
    }

    function emitRoleAdded(address _user, bytes32 _role) {
        RoleAdded(_user, _role, _getVersion());
    }

    function emitRoleRemoved(address _user, bytes32 _role) {
        RoleRemoved(_user, _role, _getVersion());
    }

    function emitSkillAreasSet(address _user, uint _areas) {
        SkillAreasSet(_user, _areas, _getVersion());
    }

    function emitSkillCategoriesSet(address _user, uint _area, uint _categories) {
        SkillCategoriesSet(_user, _area, _categories, _getVersion());
    }

    function emitSkillsSet(address _user, uint _area, uint _category, uint _skills) {
        SkillsSet(_user, _area, _category, _skills, _getVersion());
    }
}
