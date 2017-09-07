pragma solidity 0.4.11;

import './Roles2LibraryAdapter.sol';

contract ERC20LibraryInterface {
    function includes(address _contract) constant returns(bool);
}

contract Roles2LibraryAndERC20LibraryAdapter is Roles2LibraryAdapter {
    ERC20LibraryInterface erc20Library;

    modifier onlySupportedContract(address _contract) {
        if (!erc20Library.includes(_contract)) {
            return;
        }
        _;
    }

    function Roles2LibraryAndERC20LibraryAdapter(address _roles2Library, address _erc20Library)
        Roles2LibraryAdapter(_roles2Library)
    {
        erc20Library = ERC20LibraryInterface(_erc20Library);
    }

    function setERC20Library(ERC20LibraryInterface _erc20Library) auth() returns(bool) {
        erc20Library = _erc20Library;
        return true;
    }

}
