pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageUser.sol';

contract ERC20LibraryInterface {
    function includes(address _contract) constant returns(bool);
}

contract ERC20Interface {
    function transferFrom(address _from, address _to, uint _value) returns(bool);
}

contract PaymentGateway is EventsHistoryAndStorageUser, Owned {
    StorageInterface.Address erc2Library;
    StorageInterface.Address feeAddress;
    StorageInterface.Address paymentProcessor;
    StorageInterface.AddressUIntMapping fees; // 10000 is 100%.

    event FeeSet(address indexed contractAddress, uint feePercent, uint version);

    modifier onlySupportedContract(address _contract) {
        if (!getERC20Library().includes(_contract)) {
            return;
        }
        _;
    }

    modifier onlyPaymentProcessor {
        if (msg.sender != getPaymentProcessor()) {
            return;
        }
        _;
    }

    function PaymentGateway(Storage _store, bytes32 _crate) EventsHistoryAndStorageUser(_store, _crate) {
        erc2Library.init('erc2Library');
        feeAddress.init('feeAddress');
        paymentProcessor.init('paymentProcessor');
        fees.init('fees');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function setERC20Library(address _erc20Library) onlyContractOwner() returns(bool) {
        store.set(erc2Library, _erc20Library);
        return true;
    }

    function setFeeAddress(address _feeAddress) onlyContractOwner() returns(bool) {
        store.set(feeAddress, _feeAddress);
        return true;
    }

    function setPaymentProcessor(address _paymentProcessor) onlyContractOwner() returns(bool) {
        store.set(paymentProcessor, _paymentProcessor);
        return true;
    }

    function setFeePercent(address _contract, uint _feePercent)
        onlyContractOwner()
        onlySupportedContract(_contract)
    returns(bool) {
        if (_feePercent >= 10000) {
            return false;
        }
        store.set(fees, _contract, _feePercent);
        _emitFeeSet(_contract, _feePercent);
        return true;
    }

    function getFeePercent(address _contract) constant returns(uint) {
        return store.get(fees, _contract);
    }

    function transfer(address _from, address _to, uint _value, address _contract)
        onlyPaymentProcessor()
        onlySupportedContract(_contract)
    returns(bool) {
        ERC20Interface asset = ERC20Interface(_contract);
        if (!asset.transferFrom(_from, _to, _value)) {
            return false;
        }
        _takeFee(_from, _value, asset);
        return true;
    }

    function _takeFee(address _from, uint _value, ERC20Interface _asset) internal {
        uint fee = calculateFee(_value, _asset);
        if (fee == 0) {
            return;
        }
        address feeAddr = getFeeAddress();
        if (feeAddr == 0x0) {
            return;
        }
        if (!_asset.transferFrom(_from, feeAddr, fee)) {
            throw;
        }
    }

    function calculateFee(uint _value, address _contract) constant returns(uint) {
        uint feeRaw = _value * getFeePercent(_contract);
        return (feeRaw / 10000) + (feeRaw % 10000 == 0 ? 0 : 1);
    }

    function getERC20Library() constant returns(ERC20LibraryInterface) {
        return ERC20LibraryInterface(store.get(erc2Library));
    }

    function getFeeAddress() constant returns(address) {
        return store.get(feeAddress);
    }

    function getPaymentProcessor() constant returns(address) {
        return store.get(paymentProcessor);
    }

    function _emitFeeSet(address _contract, uint _feePercent) internal {
        PaymentGateway(getEventsHistory()).emitFeeSet(_contract, _feePercent);
    }

    function emitFeeSet(address _contract, uint _feePercent) {
        FeeSet(_contract, _feePercent, _getVersion());
    }
}
