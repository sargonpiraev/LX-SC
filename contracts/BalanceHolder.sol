pragma solidity 0.4.8;

import './Owned.sol';

contract ERC20Interface {
    function transfer(address _to, uint _value) returns(bool);
    function transferFrom(address _from, address _to, uint _value) returns(bool);
}

contract BalanceHolder is Owned {
    address public paymentGateway;

    modifier onlyPaymentGateway() {
        if (msg.sender != paymentGateway) {
            return;
        }
        _;
    }

    function setPaymentGateway(address _paymentGateway) onlyContractOwner() returns(bool) {
        paymentGateway = _paymentGateway;
        return true;
    }

    function deposit(address _from, uint _value, ERC20Interface _contract) onlyPaymentGateway() returns(bool) {
        return _contract.transferFrom(_from, this, _value);
    }

    function withdraw(address _to, uint _value, ERC20Interface _contract) onlyPaymentGateway() returns(bool) {
        return _contract.transfer(_to, _value);
    }
}
