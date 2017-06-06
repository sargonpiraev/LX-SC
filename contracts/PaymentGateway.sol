pragma solidity 0.4.8;

import './Owned.sol';
import './StorageAdapter.sol';
import './MultiEventsHistoryAdapter.sol';

contract ERC20LibraryInterface {
    function includes(address _contract) constant returns(bool);
}

contract ERC20BalanceInterface {
    function balanceOf(address _address) constant returns(uint);
}

contract BalanceHolderInterface {
    function deposit(address _from, uint _value, address _contract) returns(bool);
    function withdraw(address _to, uint _value, address _contract) returns(bool);
}

contract PaymentGateway is StorageAdapter, MultiEventsHistoryAdapter, Owned {
    StorageInterface.Address erc2Library;
    StorageInterface.Address feeAddress;
    StorageInterface.Address paymentProcessor;
    StorageInterface.AddressUIntMapping fees; // 10000 is 100%.
    StorageInterface.Address balanceHolder;
    StorageInterface.AddressAddressUIntMapping balances; // contract => user => balance

    event FeeSet(address indexed self, address indexed contractAddress, uint feePercent);
    event Deposited(address indexed self, address indexed contractAddress, address indexed by, uint value);
    event Withdrawn(address indexed self, address indexed contractAddress, address indexed by, uint value);
    event Transferred(address indexed self, address indexed contractAddress, address from, address indexed to, uint value);

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

    function PaymentGateway(Storage _store, bytes32 _crate) StorageAdapter(_store, _crate) {
        erc2Library.init('erc2Library');
        feeAddress.init('feeAddress');
        paymentProcessor.init('paymentProcessor');
        fees.init('fees');
        balanceHolder.init('balanceHolder');
        balances.init('balances');
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

    function setBalanceHolder(address _balanceHolder) onlyContractOwner() returns(bool) {
        store.set(balanceHolder, _balanceHolder);
        return true;
    }

    function setFeePercent(uint _feePercent, address _contract)
        onlyContractOwner()
        onlySupportedContract(_contract)
    returns(bool) {
        if (_feePercent >= 10000) {
            return false;
        }
        store.set(fees, _contract, _feePercent);
        _emitFeeSet(_feePercent, _contract);
        return true;
    }

    function getFeePercent(address _contract) constant returns(uint) {
        return store.get(fees, _contract);
    }

    // Will be optimized later if used.
    function transfer(address _from, address _to, uint _value, address _contract) returns(bool) {
        return transferWithFee(_from, _to, _value, _value, 0, _contract);
    }

    function transferWithFee(
        address _from,
        address _to,
        uint _value,
        uint _feeFromValue,
        uint _additionalFee,
        address _contract
    )
    returns(bool) {
        address[] memory toArray = new address[](1);
        toArray[0] = _to;
        uint[] memory valueArray = new uint[](1);
        valueArray[0] = _value;
        return transferToMany(_from, toArray, valueArray, _feeFromValue, _additionalFee, _contract);
    }

    function transferToMany(
        address _from,
        address[] _to,
        uint[] _value,
        uint _feeFromValue,
        uint _additionalFee,
        address _contract
    )
        onlyPaymentProcessor()
        onlySupportedContract(_contract)
    returns(bool) {
        if (_to.length != _value.length) {
            return false;
        }
        uint total = 0;
        for(uint i = 0; i < _to.length; i++) {
            _addBalance(_to[i], _value[i], _contract);
            _emitTransferred(_from, _to[i], _value[i], _contract);
            total = _safeAdd(total, _value[i]);
        }
        uint fee = _safeAdd(calculateFee(_feeFromValue, _contract), _additionalFee);
        if (fee > 0 && getFeeAddress() != 0x0) {
            _addBalance(getFeeAddress(), fee, _contract);
            _emitTransferred(_from, getFeeAddress(), fee, _contract);
            total = _safeAdd(total, fee);
        }
        _subBalance(_from, total, _contract);
        return true;
    }

    function transferAll(
        address _from,
        address _to,
        uint _value,
        address _change,
        uint _feeFromValue,
        uint _additionalFee,
        address _contract
    )
        onlyPaymentProcessor()
        onlySupportedContract(_contract)
    returns(bool) {
        uint total = _value;
        _addBalance(_to, _value, _contract);
        _emitTransferred(_from, _to, _value, _contract);
        uint fee = _safeAdd(calculateFee(_feeFromValue, _contract), _additionalFee);
        if (fee > 0 && getFeeAddress() != 0x0) {
            _addBalance(getFeeAddress(), fee, _contract);
            _emitTransferred(_from, getFeeAddress(), fee, _contract);
            total = _safeAdd(total, fee);
        }
        uint change = _safeSub(getBalance(_from, _contract), total);
        if (change != 0) {
            _addBalance(_change, change, _contract);
            _emitTransferred(_from, _change, change, _contract);
        }
        return true;
    }

    function transferFromMany(
        address[] _from,
        address _to,
        uint[] _value,
        address _contract
    )
        onlyPaymentProcessor()
        onlySupportedContract(_contract)
    returns(bool) {
        if (_from.length != _value.length) {
            return false;
        }
        uint total = 0;
        for(uint i = 0; i < _from.length; i++) {
            _subBalance(_from[i], _value[i], _contract);
            _emitTransferred(_from[i], _to, _value[i], _contract);
            total = _safeAdd(total, _value[i]);
        }
        _addBalance(_to, total, _contract);
        return true;
    }

    function _addBalance(address _to, uint _value, address _contract) internal {
        store.set(balances, _contract, _to, _safeAdd(getBalance(_to, _contract), _value));
    }

    function _subBalance(address _from, uint _value, address _contract) internal {
        store.set(balances, _contract, _from, _safeSub(getBalance(_from, _contract), _value));
    }

    function _assert(bool _assertion) internal {
        if (!_assertion) {
            throw;
        }
    }

    function _safeSub(uint _a, uint _b) internal constant returns(uint) {
        _assert(_b <= _a);
        return _a - _b;
    }

    function _safeAdd(uint _a, uint _b) internal constant returns(uint) {
        uint c = _a + _b;
        _assert(c >= _a);
        return c;
    }

    function deposit(uint _value, address _contract) onlySupportedContract(_contract) returns(bool) {
        uint balanceBefore = getBalanceOf(getBalanceHolder(), _contract);
        if (!getBalanceHolder().deposit(msg.sender, _value, _contract)) {
            return false;
        }
        uint depositedAmount = _safeSub(getBalanceOf(getBalanceHolder(), _contract), balanceBefore);
        store.set(balances, _contract, msg.sender, _safeAdd(getBalance(msg.sender, _contract), depositedAmount));
        _emitDeposited(msg.sender, depositedAmount, _contract);
        return true;
    }

    function withdraw(uint _value, address _contract) returns(bool) {
        return _withdraw(msg.sender, _value, _contract);
    }

    function _withdraw(address _from, uint _value, address _contract) internal returns(bool) {
        uint balanceBefore = getBalanceOf(getBalanceHolder(), _contract);
        if (!getBalanceHolder().withdraw(_from, _value, _contract)) {
            return false;
        }
        uint withdrawnAmount = _safeSub(balanceBefore, getBalanceOf(getBalanceHolder(), _contract));
        if (withdrawnAmount == 0) {
            return false;
        }
        store.set(balances, _contract, _from, _safeSub(getBalance(_from, _contract), withdrawnAmount));
        _emitWithdrawn(_from, _value, _contract);
        return true;
    }

    function forwardFee(uint _value, address _contract) returns(bool) {
        if (getFeeAddress() == 0x0) {
            return false;
        }
        return _withdraw(getFeeAddress(), _value, _contract);
    }

    function getBalance(address _address, address _contract) constant returns(uint) {
        return store.get(balances, _contract, _address);
    }

    function getBalanceOf(address _address, address _contract) constant returns(uint) {
        return ERC20BalanceInterface(_contract).balanceOf(_address);
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

    function getBalanceHolder() constant returns(BalanceHolderInterface) {
        return BalanceHolderInterface(store.get(balanceHolder));
    }

    function _emitFeeSet(uint _feePercent, address _contract) internal {
        PaymentGateway(getEventsHistory()).emitFeeSet(_feePercent, _contract);
    }

    function _emitDeposited(address _by, uint _value, address _contract) internal {
        PaymentGateway(getEventsHistory()).emitDeposited(_by, _value, _contract);
    }

    function _emitWithdrawn(address _by, uint _value, address _contract) internal {
        PaymentGateway(getEventsHistory()).emitWithdrawn(_by, _value, _contract);
    }

    function _emitTransferred(address _from, address _to, uint _value, address _contract) internal {
        PaymentGateway(getEventsHistory()).emitTransferred(_from, _to, _value, _contract);
    }

    function emitFeeSet(uint _feePercent, address _contract) {
        FeeSet(_self(), _contract, _feePercent);
    }

    function emitDeposited(address _by, uint _value, address _contract) {
        Deposited(_self(), _contract, _by, _value);
    }

    function emitWithdrawn(address _by, uint _value, address _contract) {
        Withdrawn(_self(), _contract, _by, _value);
    }

    function emitTransferred(address _from, address _to, uint _value, address _contract) {
        Transferred(_self(), _contract, _from, _to, _value);
    }
}
