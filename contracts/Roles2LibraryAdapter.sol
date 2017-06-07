pragma solidity 0.4.8;

contract Roles2LibraryInterface {
    function canCall(address _src, address _code, bytes4 _sig) constant returns(bool);
}

contract Roles2LibraryAdapter {
    Roles2LibraryInterface roles2library;

    modifier auth() {
        if (!_isAuthorized(msg.sender, msg.sig)) {
            return;
        }
        _;
    }

    function setRoles2Library(address _roles2Library) returns(bool);

    function _isAuthorized(address _src, bytes4 _sig) internal returns(bool) {
        if (_src == address(this)) {
            return true;
        }
        if (address(roles2library) == 0) {
            return false;
        }
        return roles2library.canCall(_src, this, _sig);
    }
}
