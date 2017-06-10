pragma solidity 0.4.8;

import './Roles2LibraryAdapter.sol';

contract ERC20Interface {
    function transfer(address _to, uint _value) returns(bool);
    function transferFrom(address _from, address _to, uint _value) returns(bool);
}

contract BalanceHolder is Roles2LibraryAdapter {
    function BalanceHolder(address _roles2Library) Roles2LibraryAdapter(_roles2Library) {}

    function deposit(address _from, uint _value, ERC20Interface _contract) auth() returns(bool) {
        return _contract.transferFrom(_from, this, _value);
    }

    function withdraw(address _to, uint _value, ERC20Interface _contract) auth() returns(bool) {
        return _contract.transfer(_to, _value);
    }
}
