pragma solidity 0.4.11;

contract Roles2LibraryInterface {
    function addUserRole(address _user, uint8 _role) returns(bool);
    function canCall(address _src, address _code, bytes4 _sig) constant returns(bool);
}

contract Roles2LibraryAdapter {
    Roles2LibraryInterface roles2Library;

    modifier auth() {
        if (!_isAuthorized(msg.sender, msg.sig)) {
            return;
        }
        _;
    }

    function Roles2LibraryAdapter(address _roles2Library) {
        roles2Library = Roles2LibraryInterface(_roles2Library);
    }

    function setRoles2Library(Roles2LibraryInterface _roles2Library) auth() returns(bool) {
        roles2Library = _roles2Library;
        return true;
    }

    function _isAuthorized(address _src, bytes4 _sig) internal returns(bool) {
        if (_src == address(this)) {
            return true;
        }
        if (address(roles2Library) == 0) {
            return false;
        }
        return roles2Library.canCall(_src, this, _sig);
    }
}
