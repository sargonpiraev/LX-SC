pragma solidity 0.4.8;

import './Owned.sol';
import './StorageAdapter.sol';

contract PaymentGatewayInterface {
    function transferWithFee(address _from, address _to, uint _value, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
    function transferToMany(address _from, address[] _to, uint[] _value, uint _feeFromValue, uint _additionalFee, address _contract) returns(bool);
}

contract PaymentProcessor is StorageAdapter, Owned {
    StorageInterface.Address paymentGateway;
    StorageInterface.Address jobController;
    bool public serviceMode = false;
    mapping(bytes32 => bool) public approved;

    modifier onlyJobController {
        if (msg.sender != getJobController()) {
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

    function PaymentProcessor(Storage _store, bytes32 _crate) StorageAdapter(_store, _crate) {
        paymentGateway.init('paymentGateway');
        jobController.init('jobController');
    }

    function setPaymentGateway(address _paymentGateway) onlyContractOwner() returns(bool) {
        store.set(paymentGateway, _paymentGateway);
        return true;
    }

    function setJobController(address _jobController) onlyContractOwner() returns(bool) {
        store.set(jobController, _jobController);
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

    function lockPayment(bytes32 _operationId, address _from, uint _value, address _contract)
        onlyJobController()
        onlyApproved(_operationId)
    returns(bool) {
        return getPaymentGateway().transferWithFee(_from, msg.sender, _value, 0, 0, _contract);
    }

    function releasePayment(bytes32 _operationId, address[] _to, uint[] _value, uint _feeFromValue, uint _additionalFee, address _contract)
        onlyJobController()
        onlyApproved(_operationId)
    returns(bool) {
        return getPaymentGateway().transferToMany(msg.sender, _to, _value, _feeFromValue, _additionalFee, _contract);
    }

    function getPaymentGateway() constant returns(PaymentGatewayInterface) {
        return PaymentGatewayInterface(store.get(paymentGateway));
    }

    function getJobController() constant returns(address) {
        return store.get(jobController);
    }
}
