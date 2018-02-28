pragma solidity ^0.4.11;


import './User.sol';
import './UserLibrary.sol';
import './UserProxy.sol';
import './adapters/MultiEventsHistoryAdapter.sol';
import './adapters/Roles2LibraryAdapter.sol';


contract UserLibraryInterface {
    function setMany(address _user, uint _areas, uint[] _categories, uint[] _skills) public returns (uint);
}


contract UserFactory is MultiEventsHistoryAdapter, Roles2LibraryAdapter {

    event UserCreated(
        address indexed self,
        address indexed user,
        address proxy,
        address recoveryContract,
        address owner,
        uint8[] roles,
        uint areas,
        uint[] categories,
        uint[] skills
    );

    UserLibraryInterface userLibrary;

    function UserFactory(address _roles2Library) Roles2LibraryAdapter(_roles2Library) public {}

    function setupEventsHistory(address _eventsHistory) auth external returns (uint) {
        require(_eventsHistory != 0x0);

        _setEventsHistory(_eventsHistory);
        return OK;
    }

    function setUserLibrary(UserLibraryInterface _userLibrary) auth external returns (uint) {
        userLibrary = _userLibrary;
        return OK;
    }

    function getUserLibrary() public view returns (address) {
        return userLibrary;
    }

    function createUserWithProxyAndRecovery(
        address _owner,
        address _recoveryContract,
        uint8[] _roles,
        uint _areas,
        uint[] _categories,
        uint[] _skills
    )
    auth
    public
    returns (uint) 
    {
        require(_owner != 0x0);
        User user = new User(_owner, _recoveryContract);
        UserProxy proxy = UserProxy(user.getUserProxy());
        _setRoles(proxy, _roles);
        _setSkills(proxy, _areas, _categories, _skills);

        _emitUserCreated(user, proxy, _recoveryContract, _owner, _roles, _areas, _categories, _skills);
        return OK;
    }

    function _setRoles(address _user, uint8[] _roles) internal {
        for (uint i = 0; i < _roles.length; i++) {
            if (OK != roles2Library.addUserRole(_user, _roles[i])) {
                revert();
            }
        }
    }

    function _setSkills(address _user, uint _areas, uint[] _categories, uint[] _skills) internal {
        if (_areas == 0) {
            return;
        }
 
        if (OK != userLibrary.setMany(_user, _areas, _categories, _skills)) {
            revert();
        }
    }

    function _emitUserCreated(
        address _user,
        address _proxy,
        address _recoveryContract,
        address _owner,
        uint8[] _roles,
        uint _areas,
        uint[] _categories,
        uint[] _skills
    ) 
    internal 
    {
        UserFactory(getEventsHistory()).emitUserCreated(
            _user,
            _proxy,
            _recoveryContract,
            _owner,
            _roles,
            _areas,
            _categories,
            _skills
        );
    }

    function emitUserCreated(
        address _user,
        address _proxy,
        address _recoveryContract,
        address _owner,
        uint8[] _roles,
        uint _areas,
        uint[] _categories,
        uint[] _skills
    ) 
    public 
    {
        UserCreated(
            _self(),
            _user,
            _proxy,
            _recoveryContract,
            _owner,
            _roles,
            _areas,
            _categories,
            _skills
        );
    }
}
