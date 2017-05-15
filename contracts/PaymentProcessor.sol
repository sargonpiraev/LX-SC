pragma solidity 0.4.8;

import './Owned.sol';

contract PaymentGatewayInterface {
    function transferWithFee(address _from, address _to, uint _value, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
    function transferToMany(address _from, address[] _to, uint[] _value, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
}

contract PaymentProcessor is Owned {
    PaymentGatewayInterface public paymentGateway;
    address public jobController;
    bool public serviceMode = false;
    mapping(bytes32 => bool) public approved;

    modifier onlyJobController {
        if (msg.sender != jobController) {
            return;
        }
        _;
    }

    modifier onlyApproved(bytes32 _operationId) {
        if (serviceMode && !approved[_operationId]) {
            return;
        }
        _;
        if (serviceMode) {
            approved[_operationId] = false;
        }
    }

    function setPaymentGateway(PaymentGatewayInterface _paymentGateway) onlyContractOwner() returns(bool) {
        paymentGateway = _paymentGateway;
        return true;
    }

    function setJobController(address _jobController) onlyContractOwner() returns(bool) {
        jobController = _jobController;
        return true;
    }

    function enableServiceMode() onlyContractOwner() returns(bool) {
        serviceMode = true;
        return true;
    }

    function disableServiceMode() onlyContractOwner() returns(bool) {
        serviceMode = false;
        return true;
    }

    function approve(bytes32 _operationId) onlyContractOwner() returns(bool) {
        approved[_operationId] = true;
        return true;
    }

    function lockPayment(bytes32 _operationId, address _from, uint _value, address _contract)
        onlyJobController()
        onlyApproved(_operationId)
    returns(bool) {
        return paymentGateway.transferWithFee(_from, msg.sender, _value, 0, 0, _contract);
    }

    function releasePayment(bytes32 _operationId, address[] _to, uint[] _value, uint _feeFromValue, uint _additionalFee, address _contract)
        onlyJobController()
        onlyApproved(_operationId)
    returns(bool) {
        return paymentGateway.transferToMany(msg.sender, _to, _value, _feeFromValue, _additionalFee, _contract);
    }
}
