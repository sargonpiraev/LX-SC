pragma solidity ^0.4.17;

import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FakeERC20Token is DetailedERC20, BurnableToken, PausableToken {
    using SafeMath for uint256;

    uint public constant INITIAL_SUPPLY = 1000000000 * (10**18);

    /**
    * @dev Constructor
    */
    function FakeERC20Token() public
    DetailedERC20("LHT Token", "LHT", 18)
    {
        totalSupply_ = INITIAL_SUPPLY;

        balances[msg.sender] = INITIAL_SUPPLY;
        Transfer(0x0, msg.sender, INITIAL_SUPPLY);
    }

    function massTransfer(address[] _recipients, uint[] _amounts) external returns (bool) {
        require(_recipients.length == _amounts.length);

        for (uint i = 0; i < _recipients.length; i++) {
            require(transfer(_recipients[i], _amounts[i]));
        }

        return true;
    }
}
