"use strict";

const Asserts = require('./asserts');
const Roles2LibraryInterface = artifacts.require('./Roles2LibraryInterface.sol');
const roles2LibraryInterface = web3.eth.contract(Roles2LibraryInterface.abi).at('0x0');
const asserts = Asserts(assert);


module.exports = {
  getSig: (callData) => web3.sha3(callData).slice(0, 10),
  increaseTime: (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [time],
        id: new Date().getTime()
      }, (error, result) => error ? reject(error) : resolve(result.result))
    });
  },
  mine: () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, (error, result) => error ? reject(error) : resolve(result.result))
    });
  },
  assertExpectations: (mock, expected = 0, callsCount = null) => {
    let expectationsCount;
    return () => {
      return mock.expectationsLeft()
      .then(asserts.equal(expected))
      .then(() => mock.expectationsCount())
      .then(result => expectationsCount = result)
      .then(() => mock.callsCount())
      .then(result => asserts.equal(callsCount === null ? expectationsCount : callsCount)(result));
    };
  },

  ignoreAuth: (mock, enabled = true) => {
    return mock.ignore(roles2LibraryInterface.canCall.getData().slice(0, 10), enabled);
  },
  getFlag: index => {
    return web3.toBigNumber(2).pow(index*2);
  },
  getEvenFlag: index => {
    return web3.toBigNumber(2).pow(index*2 + 1);
  },
  eventEquals: (tx, event) => {
    assert.equal(tx.logs[0].event, event);
  },
}
