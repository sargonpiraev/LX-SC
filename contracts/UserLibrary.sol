pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageAdapter.sol';

contract RolesLibraryInterface {
    function count() constant returns(uint);
    function includes(bytes32 _role) constant returns(bool);
    function getRole(uint _index) constant returns(bytes32);
}

/**
 * @title LaborX User Library.
 *
 * Skills:
 * Here we encode 128 different areas, each with 128 different categories
 * each with 256 different skills, using bit flags starting from the right,
 * for every user.
 * Areas and categories use odd bit flags to indicate that entity is
 * partially filled (area has categories, or category has skills).
 * Areas and categories use even bit flags to indicate that entity is
 * fully filled (area has all categories and skills, or category has all skills).
 * Skills is any bit.
 * It results in that that:
 *   all the areas for the user are defined using single uint256.
 *     all the categories of a single area of user are defined using single uint256.
 *       all the skills of a single category of user are defined using single uint256.
 *
 * 00000001 is the first partial area.
 * 00000100 is the second partial area.
 * 00000101 is the first and second partial areas.
 * 00001101 is the first full and second partial areas.
 * 00000010 is invalid, because in order to be full area also should be partial.
 * Same encoding is used for categories.
 * 
 * For skills:
 * 00000001 is the first skill.
 * 00000010 is the second skill.
 * 01000011 is the first, second and seventh skill.
 *
 * Example skills structure for some user:
 * 00110001 - Full third area, and partial first area.
 *   01001101 - First area: partial first and fourth category, full second category.
 *     11100000 - First category: sixs, senventh and eights skills.
 *     10001001 - Fourth category: first, fourth and eights skills.
 */
contract UserLibrary is EventsHistoryAndStorageAdapter, Owned {
    StorageInterface.Mapping roles;
    StorageInterface.Address rolesLibrary;
    StorageInterface.AddressUIntMapping skillAreas;
    StorageInterface.AddressUIntUIntMapping skillCategories;
    StorageInterface.AddressUIntUIntUIntMapping skills;

    event RoleAdded(address indexed user, bytes32 indexed role, uint version);
    event RoleRemoved(address indexed user, bytes32 indexed role, uint version);

    event SkillAreasSet(address indexed user, uint areas, uint version);
    event SkillCategoriesSet(address indexed user, uint indexed area, uint categories, uint version);
    event SkillsSet(address indexed user, uint indexed area, uint indexed category, uint skills, uint version);

    modifier singleFlag(uint _flag) {
        if (!_isSingleFlag(_flag)) {
            return;
        }
        _;
    }

    modifier oddFlag(uint _flag) {
        if (!_isOddFlag(_flag)) {
            return;
        }
        _;
    }

    modifier ifEvenThenOddTooFlags(uint _flags) {
        if (!_ifEvenThenOddTooFlags(_flags)) {
            return;
        }
        _;
    }

    modifier hasFlags(uint _flags) {
        if (_flags == 0) {
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

    function UserLibrary(Storage _store, bytes32 _crate) EventsHistoryAndStorageAdapter(_store, _crate) {
        roles.init('roles');
        rolesLibrary.init('rolesLibrary');
        skillAreas.init('skillAreas');
        skillCategories.init('skillCategories');
        skills.init('skills');
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

    // Will return user role only if it is present in RolesLibrary.
    function hasRole(address _user, bytes32 _role) constant returns(bool) {
        return getRolesLibrary().includes(_role) && store.get(roles, bytes32(_user), _role).toBool();
    }

    function getAreaInfo(address _user, uint _area)
        singleFlag(_area)
        oddFlag(_area)
        constant
    returns(bool partialArea, bool fullArea) {
        uint areas = store.get(skillAreas, _user);
        return (_hasFlag(areas, _area), _hasFlag(areas, _area << 1));
    }

    function hasArea(address _user, uint _area) constant returns(bool) {
        var (partial,) = getAreaInfo(_user, _area);
        return partial;
    }

    function getCategoryInfo(address _user, uint _area, uint _category)
        singleFlag(_category)
        oddFlag(_category)
        constant
    returns(bool partialCategory, bool fullCategory) {
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

    function hasSkill(address _user, uint _area, uint _category, uint _skill) singleFlag(_skill) constant returns(bool) {
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
        for (uint area = 1; area != 0; area = area << 2) {
            if (_isFullOrNull(areas, area)) {
                continue;
            }
            tempCategories.push(store.get(skillCategories, _user, area));
            for (uint category = 1; category != 0; category = category << 2) {
                if (_isFullOrNull(tempCategories[tempCategories.length - 1], category)) {
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

    function setAreas(address _user, uint _areas)
        ifEvenThenOddTooFlags(_areas)
        onlyContractOwner()
    returns(bool) {
        for (uint area = 1; area != 0; area = area << 2) {
            if (_isFullOrNull(_areas, area)) {
                continue;
            }
            if (store.get(skillCategories, _user, area) == 0) {
                return false;
            }
        }
        _setAreas(_user, _areas);
        return true;
    }

    function setCategories(address _user, uint _area, uint _categories)
        singleFlag(_area)
        oddFlag(_area)
        ifEvenThenOddTooFlags(_categories)
        hasFlags(_categories)
        onlyContractOwner()
    returns(bool) {
        _addArea(_user, _area);
        for (uint category = 1; category != 0; category = category << 2) {
            if (_isFullOrNull(_categories, category)) {
                continue;
            }
            if (store.get(skills, _user, _area, category) == 0) {
                return false;
            }
        }
        _setCategories(_user, _area, _categories);
        return true;
    }

    function setSkills(address _user, uint _area, uint _category, uint _skills)
        singleFlag(_area)
        oddFlag(_area)
        singleFlag(_category)
        oddFlag(_category)
        hasFlags(_skills)
        onlyContractOwner()
    returns(bool) {
        _addArea(_user, _area);
        _addCategory(_user, _area, _category);
        _setSkills(_user, _area, _category, _skills);
        return true;
    }

    function addMany(address _user, uint _areas, uint[] _categories, uint[] _skills) onlyContractOwner() returns(bool) {
        return _setMany(_user, _areas, _categories, _skills, false);
    }

    function setMany(address _user, uint _areas, uint[] _categories, uint[] _skills) onlyContractOwner() returns(bool) {
        return _setMany(_user, _areas, _categories, _skills, true);
    }

    function _setMany(address _user, uint _areas, uint[] _categories, uint[] _skills, bool _overWrite) internal returns(bool) {
        uint categoriesCounter = 0;
        uint skillsCounter = 0;
        if (!_ifEvenThenOddTooFlags(_areas)) {
            return false;
        }
        _setAreas(_user, _overWrite ? _areas : (store.get(skillAreas, _user) | _areas));
        for (uint area = 1; area != 0; area = area << 2) {
            if (_isFullOrNull(_areas, area)) {
                continue;
            }
            if (!_ifEvenThenOddTooFlags(_categories[categoriesCounter])) {
                throw;
            }
            _setCategories(_user, area, _overWrite ? _categories[categoriesCounter] : (store.get(skillCategories, _user, area) | _categories[categoriesCounter]));
            for (uint category = 1; category != 0; category = category << 2) {
                if (_isFullOrNull(_categories[categoriesCounter], category)) {
                    continue;
                }
                if (_skills[skillsCounter] == 0) {
                    throw;
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

    function _addArea(address _user, uint _area) internal {
        if (hasArea(_user, _area)) {
            return;
        }
        _setAreas(_user, store.get(skillAreas, _user) | _area);
    }

    function _addCategory(address _user, uint _area, uint _category) internal {
        if (hasCategory(_user, _area, _category)) {
            return;
        }
        _setCategories(_user, _area, store.get(skillCategories, _user, _area) | _category);
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
