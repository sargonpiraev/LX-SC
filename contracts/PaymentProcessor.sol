pragma solidity 0.4.8;

import './adapters/Roles2LibraryAdapter.sol';


contract PaymentGatewayInterface {
    function transferWithFee(address _from, address _to, uint _value, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
    function transferAll(address _from, address _to, uint _value, address _change, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
}

contract PaymentProcessor is Roles2LibraryAdapter {
    PaymentGatewayInterface public paymentGateway;
    bool public serviceMode = false;
    mapping(bytes32 => bool) public approved;

    modifier onlyApproved(bytes32 _operationId) {
        if (serviceMode && !approved[_operationId]) {
            return;
        }
        _;
        if (serviceMode) {
            approved[_operationId] = false;
        }
    }

    function PaymentProcessor(address _roles2Library) Roles2LibraryAdapter(_roles2Library) {}


    // Only contract owner
    function setPaymentGateway(PaymentGatewayInterface _paymentGateway) auth() returns(bool) {
        paymentGateway = _paymentGateway;
        return true;
    }

    // Only contract owner
    function enableServiceMode() auth() returns(bool) {
        serviceMode = true;
        return true;
    }

    // Only contract owner
    function disableServiceMode() auth() returns(bool) {
        serviceMode = false;
        return true;
    }

    // Only contract owner
    function approve(uint _operationId) auth() returns(bool) {
        approved[bytes32(_operationId)] = true;
        return true;
    }

    function lockPayment(bytes32 _operationId, address _from, uint _value, address _contract)
        auth()  // Only job controller
        onlyApproved(_operationId)
    returns(bool) {
        return paymentGateway.transferWithFee(_from, address(_operationId), _value, 0, 0, _contract);
    }

    function releasePayment(bytes32 _operationId, address _to, uint _value, address _change, uint _feeFromValue, uint _additionalFee, address _contract)
        auth()  // Only job controller
        onlyApproved(_operationId)
    returns(bool) {
        return paymentGateway.transferAll(address(_operationId), _to, _value, _change, _feeFromValue, _additionalFee, _contract);
    }
}
