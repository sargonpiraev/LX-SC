pragma solidity 0.4.8;

import './Owned.sol';
import './EventsHistoryAndStorageUser.sol';

contract ERC20Library is EventsHistoryAndStorageUser, Owned {
    StorageInterface.AddressesSet contracts;

    event ContractAdded(address indexed contractAddress, uint version);
    event ContractRemoved(address indexed contractAddress, uint version);

    function ERC20Library(Storage _store, bytes32 _crate) EventsHistoryAndStorageUser(_store, _crate) {
        contracts.init('contracts');
    }

    function setupEventsHistory(address _eventsHistory) onlyContractOwner() returns(bool) {
        if (getEventsHistory() != 0x0) {
            return false;
        }
        _setEventsHistory(_eventsHistory);
        return true;
    }

    function count() constant returns(uint) {
        return store.count(contracts);
    }

    function includes(address _contract) constant returns(bool) {
        return store.includes(contracts, _contract);
    }

    function getContracts() constant returns(address[]) {
        return store.get(contracts);
    }

    function getContract(uint _index) constant returns(address) {
        return store.get(contracts, _index);
    }

    function addContract(address _address) onlyContractOwner() returns(bool) {
        store.add(contracts, _address);
        _emitContractAdded(_address);
        return true;
    }

    function removeContract(address _address) onlyContractOwner() returns(bool) {
        store.remove(contracts, _address);
        _emitContractRemoved(_address);
        return true;
    }

    function _emitContractAdded(address _address) internal {
        ERC20Library(getEventsHistory()).emitContractAdded(_address);
    }

    function _emitContractRemoved(address _address) internal {
        ERC20Library(getEventsHistory()).emitContractRemoved(_address);
    }

    function emitContractAdded(address _address) {
        ContractAdded(_address, _getVersion());
    }

    function emitContractRemoved(address _address) {
        ContractRemoved(_address, _getVersion());
    }
}
